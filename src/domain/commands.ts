import { BattleStateSchema, findCombatant, type BattleState } from './battle'
import {
  clampHp,
  CombatantSchema,
  createCombatant,
  isInCrisis,
  isKnockedOut,
  type Combatant,
  type CombatantId,
  type NewCombatant,
} from './combatant'
import { domainError, type DomainError } from './errors'
import type { BattleEvent } from './events'
import type { StatusId } from './status'

/** Everything the Game Master can do to a battle. Serializable, so it can be logged or sent. */
export type BattleCommand =
  | { type: 'ADD_COMBATANT'; combatant: NewCombatant }
  | {
      type: 'UPDATE_COMBATANT'
      id: CombatantId
      changes: Partial<Pick<Combatant, 'name' | 'maxHp' | 'spriteAssetId' | 'flipSprite'>>
    }
  | { type: 'REMOVE_COMBATANT'; id: CombatantId }
  /** Moves a combatant to `toIndex` among the combatants of its own side. */
  | { type: 'MOVE_COMBATANT'; id: CombatantId; toIndex: number }
  | { type: 'DAMAGE'; id: CombatantId; amount: number }
  | { type: 'HEAL'; id: CombatantId; amount: number }
  | { type: 'SET_HP'; id: CombatantId; hp: number }
  | { type: 'SET_STATUS'; id: CombatantId; status: StatusId; active: boolean }
  | { type: 'SET_BACKGROUND'; assetId: string | null }
  | { type: 'RENAME_BATTLE'; name: string }
  | { type: 'LOAD_BATTLE'; state: BattleState }

export type CommandResult =
  { ok: true; state: BattleState; events: BattleEvent[] } | { ok: false; error: DomainError }

const ok = (state: BattleState, events: BattleEvent[]): CommandResult => ({
  ok: true,
  state,
  events,
})
const fail = (error: DomainError): CommandResult => ({ ok: false, error })

const notFound = (id: CombatantId) =>
  fail(domainError('COMBATANT_NOT_FOUND', `No combatant with id "${id}"`))

function replaceCombatant(state: BattleState, next: Combatant): BattleState {
  return { ...state, combatants: state.combatants.map((c) => (c.id === next.id ? next : c)) }
}

/** Derived threshold events (Crisis, KO, revive) caused by an HP or max-HP change. */
function thresholdEvents(before: Combatant, after: Combatant): BattleEvent[] {
  const events: BattleEvent[] = []
  const id = after.id
  if (!isKnockedOut(before) && isKnockedOut(after)) events.push({ type: 'KNOCKED_OUT', id })
  if (isKnockedOut(before) && !isKnockedOut(after)) events.push({ type: 'REVIVED', id })
  if (!isInCrisis(before) && isInCrisis(after)) events.push({ type: 'CRISIS_ENTERED', id })
  if (isInCrisis(before) && !isInCrisis(after)) events.push({ type: 'CRISIS_EXITED', id })
  return events
}

function validAmount(amount: number): boolean {
  return Number.isInteger(amount) && amount >= 0
}

/**
 * Pure reducer: applies a command and returns the new state plus the events it produced.
 * Never mutates its input. Invalid commands return `{ ok: false }` and leave state untouched.
 */
export function applyCommand(state: BattleState, command: BattleCommand): CommandResult {
  switch (command.type) {
    case 'ADD_COMBATANT': {
      if (findCombatant(state, command.combatant.id)) {
        return fail(domainError('DUPLICATE_ID', `Id "${command.combatant.id}" already in use`))
      }
      const parsed = CombatantSchema.safeParse(createCombatant(command.combatant))
      if (!parsed.success) {
        return fail(domainError('INVALID_COMBATANT', parsed.error.message))
      }
      const combatant = parsed.data
      return ok({ ...state, combatants: [...state.combatants, combatant] }, [
        { type: 'COMBATANT_ADDED', combatant },
      ])
    }

    case 'UPDATE_COMBATANT': {
      const current = findCombatant(state, command.id)
      if (!current) return notFound(command.id)
      const merged = { ...current, ...command.changes }
      // Lowering max HP drags current HP down with it.
      merged.hp = Math.min(merged.hp, merged.maxHp)
      const parsed = CombatantSchema.safeParse(merged)
      if (!parsed.success) {
        return fail(domainError('INVALID_COMBATANT', parsed.error.message))
      }
      const next = parsed.data
      return ok(replaceCombatant(state, next), [
        { type: 'COMBATANT_UPDATED', combatant: next },
        ...thresholdEvents(current, next),
      ])
    }

    case 'REMOVE_COMBATANT': {
      if (!findCombatant(state, command.id)) return notFound(command.id)
      return ok({ ...state, combatants: state.combatants.filter((c) => c.id !== command.id) }, [
        { type: 'COMBATANT_REMOVED', id: command.id },
      ])
    }

    case 'MOVE_COMBATANT': {
      const target = findCombatant(state, command.id)
      if (!target) return notFound(command.id)
      const side = state.combatants.filter((c) => c.side === target.side && c.id !== target.id)
      const toIndex = Math.min(Math.max(Math.trunc(command.toIndex), 0), side.length)
      side.splice(toIndex, 0, target)
      // Keep the other side's order untouched; same-side slots are refilled in the new order.
      const queue = [...side]
      const combatants = state.combatants.map((c) =>
        c.side === target.side ? (queue.shift() as Combatant) : c,
      )
      return ok({ ...state, combatants }, [{ type: 'COMBATANT_MOVED', id: target.id, toIndex }])
    }

    case 'DAMAGE':
    case 'HEAL': {
      const current = findCombatant(state, command.id)
      if (!current) return notFound(command.id)
      if (!validAmount(command.amount)) {
        return fail(domainError('INVALID_AMOUNT', `Invalid amount: ${command.amount}`))
      }
      const sign = command.type === 'DAMAGE' ? -1 : 1
      const hp = clampHp(current.hp + sign * command.amount, current.maxHp)
      const next = { ...current, hp }
      // The reported amount is the one actually applied (overkill/overheal are clamped).
      const applied = Math.abs(hp - current.hp)
      const main: BattleEvent =
        command.type === 'DAMAGE'
          ? { type: 'DAMAGED', id: current.id, amount: applied, hp }
          : { type: 'HEALED', id: current.id, amount: applied, hp }
      return ok(replaceCombatant(state, next), [main, ...thresholdEvents(current, next)])
    }

    case 'SET_HP': {
      const current = findCombatant(state, command.id)
      if (!current) return notFound(command.id)
      if (!validAmount(command.hp)) {
        return fail(domainError('INVALID_AMOUNT', `Invalid HP: ${command.hp}`))
      }
      const next = { ...current, hp: clampHp(command.hp, current.maxHp) }
      return ok(replaceCombatant(state, next), [
        { type: 'HP_SET', id: current.id, hp: next.hp },
        ...thresholdEvents(current, next),
      ])
    }

    case 'SET_STATUS': {
      const current = findCombatant(state, command.id)
      if (!current) return notFound(command.id)
      const has = current.statuses.includes(command.status)
      if (has === command.active) return ok(state, []) // idempotent no-op
      const statuses = command.active
        ? [...current.statuses, command.status]
        : current.statuses.filter((s) => s !== command.status)
      return ok(replaceCombatant(state, { ...current, statuses }), [
        { type: 'STATUS_CHANGED', id: current.id, status: command.status, active: command.active },
      ])
    }

    case 'SET_BACKGROUND':
      return ok({ ...state, backgroundAssetId: command.assetId }, [
        { type: 'BACKGROUND_CHANGED', assetId: command.assetId },
      ])

    case 'RENAME_BATTLE':
      return ok({ ...state, name: command.name }, [{ type: 'BATTLE_RENAMED', name: command.name }])

    case 'LOAD_BATTLE': {
      const parsed = BattleStateSchema.safeParse(command.state)
      if (!parsed.success) return fail(domainError('INVALID_BATTLE', parsed.error.message))
      return ok(parsed.data, [{ type: 'BATTLE_LOADED', state: parsed.data }])
    }
  }
}
