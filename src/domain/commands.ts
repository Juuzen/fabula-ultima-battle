import {
  BattleStateSchema,
  findCombatant,
  PresentationSchema,
  type BattleState,
  type EnemyPanel,
  type Presentation,
} from './battle'
import {
  clampResource,
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

type EditableFields =
  'name' | 'maxHp' | 'maxMp' | 'spriteAssetId' | 'portraitAssetId' | 'flipSprite'

export type PresentationChanges = {
  revealAllEnemyStats?: boolean
  enemyPanel?: Partial<EnemyPanel>
}

/** Everything the Game Master can do to a battle. Serializable, so it can be logged or sent. */
export type BattleCommand =
  | { type: 'ADD_COMBATANT'; combatant: NewCombatant }
  | { type: 'UPDATE_COMBATANT'; id: CombatantId; changes: Partial<Pick<Combatant, EditableFields>> }
  | { type: 'REMOVE_COMBATANT'; id: CombatantId }
  /** Moves a combatant to `toIndex` among the combatants of its own side. */
  | { type: 'MOVE_COMBATANT'; id: CombatantId; toIndex: number }
  | { type: 'DAMAGE'; id: CombatantId; amount: number }
  | { type: 'HEAL'; id: CombatantId; amount: number }
  | { type: 'SET_HP'; id: CombatantId; hp: number }
  | { type: 'SPEND_MP'; id: CombatantId; amount: number }
  | { type: 'RESTORE_MP'; id: CombatantId; amount: number }
  | { type: 'SET_MP'; id: CombatantId; mp: number }
  | { type: 'SET_STATUS'; id: CombatantId; status: StatusId; active: boolean }
  | { type: 'SET_REVEAL_STATS'; id: CombatantId; reveal: boolean }
  | { type: 'SET_PRESENTATION'; changes: PresentationChanges }
  | { type: 'SET_BACKGROUND'; assetId: string | null }
  | { type: 'RENAME_BATTLE'; name: string }
  | { type: 'LOAD_BATTLE'; state: BattleState }
  /** Ends the encounter: enemies leave the field, the party stays as it is. */
  | { type: 'END_BATTLE' }

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

const invalidAmount = (amount: number) =>
  fail(domainError('INVALID_AMOUNT', `Invalid amount: ${amount}`))

type Resource = 'hp' | 'mp'

const maxOf = (c: Combatant, resource: Resource) => (resource === 'hp' ? c.maxHp : c.maxMp)

/** Shared logic of DAMAGE/HEAL/SPEND_MP/RESTORE_MP: move HP or MP by `amount` in `direction`. */
function adjustResource(
  state: BattleState,
  id: CombatantId,
  resource: Resource,
  direction: -1 | 1,
  amount: number,
): CommandResult {
  const current = findCombatant(state, id)
  if (!current) return notFound(id)
  if (!validAmount(amount)) return invalidAmount(amount)

  const value = clampResource(current[resource] + direction * amount, maxOf(current, resource))
  const next = { ...current, [resource]: value }
  // The reported amount is the one actually applied (overkill/overheal are clamped).
  const applied = Math.abs(value - current[resource])

  let main: BattleEvent
  if (resource === 'hp') {
    main =
      direction < 0
        ? { type: 'DAMAGED', id, amount: applied, hp: value }
        : { type: 'HEALED', id, amount: applied, hp: value }
  } else {
    main =
      direction < 0
        ? { type: 'MP_SPENT', id, amount: applied, mp: value }
        : { type: 'MP_RESTORED', id, amount: applied, mp: value }
  }

  return ok(replaceCombatant(state, next), [main, ...thresholdEvents(current, next)])
}

function setResource(
  state: BattleState,
  id: CombatantId,
  resource: Resource,
  target: number,
): CommandResult {
  const current = findCombatant(state, id)
  if (!current) return notFound(id)
  if (!validAmount(target)) return invalidAmount(target)

  const value = clampResource(target, maxOf(current, resource))
  const next = { ...current, [resource]: value }
  const main: BattleEvent =
    resource === 'hp' ? { type: 'HP_SET', id, hp: value } : { type: 'MP_SET', id, mp: value }
  return ok(replaceCombatant(state, next), [main, ...thresholdEvents(current, next)])
}

function mergePresentation(current: Presentation, changes: PresentationChanges): Presentation {
  return {
    revealAllEnemyStats: changes.revealAllEnemyStats ?? current.revealAllEnemyStats,
    enemyPanel: { ...current.enemyPanel, ...changes.enemyPanel },
  }
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
      // Lowering a maximum drags the current value down with it.
      merged.hp = Math.min(merged.hp, merged.maxHp)
      merged.mp = Math.min(merged.mp, merged.maxMp)
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
      return adjustResource(state, command.id, 'hp', -1, command.amount)
    case 'HEAL':
      return adjustResource(state, command.id, 'hp', 1, command.amount)
    case 'SET_HP':
      return setResource(state, command.id, 'hp', command.hp)
    case 'SPEND_MP':
      return adjustResource(state, command.id, 'mp', -1, command.amount)
    case 'RESTORE_MP':
      return adjustResource(state, command.id, 'mp', 1, command.amount)
    case 'SET_MP':
      return setResource(state, command.id, 'mp', command.mp)

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

    case 'SET_REVEAL_STATS': {
      const current = findCombatant(state, command.id)
      if (!current) return notFound(command.id)
      if (current.revealStats === command.reveal) return ok(state, [])
      return ok(replaceCombatant(state, { ...current, revealStats: command.reveal }), [
        { type: 'STATS_REVEAL_CHANGED', id: current.id, reveal: command.reveal },
      ])
    }

    case 'SET_PRESENTATION': {
      const parsed = PresentationSchema.safeParse(
        mergePresentation(state.presentation, command.changes),
      )
      if (!parsed.success) return fail(domainError('INVALID_PRESENTATION', parsed.error.message))
      return ok({ ...state, presentation: parsed.data }, [
        { type: 'PRESENTATION_CHANGED', presentation: parsed.data },
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

    case 'END_BATTLE': {
      const removedEnemyIds = state.combatants.filter((c) => c.side === 'enemy').map((c) => c.id)
      return ok(
        {
          ...state,
          combatants: state.combatants.filter((c) => c.side !== 'enemy'),
          presentation: mergePresentation(state.presentation, {
            revealAllEnemyStats: false,
            enemyPanel: { visible: false },
          }),
        },
        [{ type: 'BATTLE_ENDED', removedEnemyIds }],
      )
    }
  }
}
