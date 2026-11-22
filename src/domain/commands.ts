import { ActionSchema, type Action } from './action'
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
import { renamedCopy } from './unit'

type EditableFields =
  'name' | 'maxHp' | 'maxMp' | 'hp' | 'mp' | 'spriteAssetId' | 'portraitAssetId' | 'flipSprite'

/** What a combatant takes from its library sheet while on the field. */
export type SheetFields =
  'name' | 'maxHp' | 'maxMp' | 'spriteAssetId' | 'portraitAssetId' | 'flipSprite'

export type PresentationChanges = {
  revealAllEnemyStats?: boolean
  waitingBackgroundAssetId?: string | null
  enemyPanel?: Partial<EnemyPanel>
}

/** Everything the Game Master can do to a battle. Serializable, so it can be logged or sent. */
export type BattleCommand =
  | { type: 'ADD_COMBATANT'; combatant: NewCombatant }
  /** Adds several combatants at once (e.g. "Goblin ×3" from the bestiary): one undo step. */
  | { type: 'DEPLOY'; combatants: NewCombatant[] }
  /**
   * Replaces the field with a prepared scene: both sides, name and background. The battle
   * goes back to preparation, so the enemies stay hidden until START_BATTLE.
   */
  | {
      type: 'LOAD_SCENE'
      name: string
      backgroundAssetId: string | null
      combatants: NewCombatant[]
    }
  | { type: 'UPDATE_COMBATANT'; id: CombatantId; changes: Partial<Pick<Combatant, EditableFields>> }
  /**
   * A library sheet changed: every combatant deployed from it follows (name, maximums, art).
   * Current PV/PM stay, clamped to the new maximums. Enemy copies keep their number.
   */
  | {
      type: 'SYNC_UNIT'
      unitId: string
      /** The sheet's name before the change, to rename "Goblin 2" into "Orco 2". */
      previousName: string
      sheet: Pick<Combatant, SheetFields>
    }
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
  /** Reveals the prepared enemies to the players. */
  | { type: 'START_BATTLE' }
  /** A choreographed action (attack, spell…) on one or more targets: one undo step. */
  | { type: 'PERFORM_ACTION'; action: Action }
  /** Ends the scene: everyone leaves the field, back to an empty battle in preparation. */
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
    waitingBackgroundAssetId:
      changes.waitingBackgroundAssetId === undefined
        ? current.waitingBackgroundAssetId
        : changes.waitingBackgroundAssetId,
    enemyPanel: { ...current.enemyPanel, ...changes.enemyPanel },
  }
}

/**
 * Appends new combatants after validating them. Ids must be unique, and a party sheet can be
 * on the field only once (enemy sheets can be deployed in any number of copies).
 */
function addCombatants(state: BattleState, incoming: NewCombatant[]): CommandResult {
  const ids = new Set(state.combatants.map((c) => c.id))
  const partyUnits = new Set(
    state.combatants.flatMap((c) => (c.side === 'ally' && c.unitId ? [c.unitId] : [])),
  )
  const added: Combatant[] = []
  for (const input of incoming) {
    if (ids.has(input.id)) {
      return fail(domainError('DUPLICATE_ID', `Id "${input.id}" already in use`))
    }
    const parsed = CombatantSchema.safeParse(createCombatant(input))
    if (!parsed.success) return fail(domainError('INVALID_COMBATANT', parsed.error.message))
    const combatant = parsed.data
    if (combatant.side === 'ally' && combatant.unitId) {
      if (partyUnits.has(combatant.unitId)) {
        return fail(
          domainError(
            'UNIT_ALREADY_DEPLOYED',
            `Sheet "${combatant.unitId}" is already on the field`,
          ),
        )
      }
      partyUnits.add(combatant.unitId)
    }
    ids.add(combatant.id)
    added.push(combatant)
  }
  return ok(
    { ...state, combatants: [...state.combatants, ...added] },
    added.map((combatant) => ({ type: 'COMBATANT_ADDED', combatant })),
  )
}

const KIND_COMMAND = {
  damage: 'DAMAGE',
  heal: 'HEAL',
  mpDamage: 'SPEND_MP',
  mpRestore: 'RESTORE_MP',
} as const

/**
 * Applies an action as a chain of basic commands (MP cost, then each target's own outcome
 * and statuses), all or nothing. The chain's events follow ACTION_PERFORMED, which opens the
 * sequence on the Display (only while the battle is in progress: see the projection).
 */
function performAction(state: BattleState, input: Action): CommandResult {
  const parsed = ActionSchema.safeParse(input)
  if (!parsed.success) return fail(domainError('INVALID_ACTION', parsed.error.message))
  const action = parsed.data

  const actor = action.actorId === null ? null : findCombatant(state, action.actorId)
  if (action.actorId !== null && !actor) return notFound(action.actorId)
  for (const target of action.targets) {
    if (!findCombatant(state, target.id)) return notFound(target.id)
  }
  if (actor && action.mpCost > actor.mp) {
    return fail(domainError('NOT_ENOUGH_MP', `${actor.name} has ${actor.mp} MP`))
  }

  const steps: BattleCommand[] = []
  if (actor && action.mpCost > 0) {
    steps.push({ type: 'SPEND_MP', id: actor.id, amount: action.mpCost })
  }
  for (const target of action.targets) {
    if (target.change) {
      const { kind, amount } = target.change
      steps.push({ type: KIND_COMMAND[kind], id: target.id, amount })
    }
    for (const status of target.addStatuses) {
      steps.push({ type: 'SET_STATUS', id: target.id, status, active: true })
    }
    for (const status of target.removeStatuses) {
      steps.push({ type: 'SET_STATUS', id: target.id, status, active: false })
    }
  }

  let current = state
  const events: BattleEvent[] = [
    {
      type: 'ACTION_PERFORMED',
      actorId: actor?.id ?? null,
      name: action.name,
      effect: action.effect,
      targetIds: action.targets.map((t) => t.id),
    },
  ]
  for (const step of steps) {
    const result = applyCommand(current, step)
    if (!result.ok) return result
    current = result.state
    events.push(...result.events)
  }
  return ok(current, events)
}

/**
 * Pure reducer: applies a command and returns the new state plus the events it produced.
 * Never mutates its input. Invalid commands return `{ ok: false }` and leave state untouched.
 */
export function applyCommand(state: BattleState, command: BattleCommand): CommandResult {
  switch (command.type) {
    case 'ADD_COMBATANT':
      return addCombatants(state, [command.combatant])

    case 'DEPLOY':
      if (command.combatants.length === 0) return ok(state, [])
      return addCombatants(state, command.combatants)

    case 'LOAD_SCENE': {
      const base: BattleState = {
        ...state,
        name: command.name.trim(),
        phase: 'preparation',
        backgroundAssetId: command.backgroundAssetId,
        combatants: [],
        presentation: mergePresentation(state.presentation, {
          revealAllEnemyStats: false,
          enemyPanel: { visible: false },
        }),
      }
      const result = addCombatants(base, command.combatants)
      if (!result.ok) return result
      return ok(result.state, [{ type: 'BATTLE_LOADED', state: result.state }])
    }

    case 'UPDATE_COMBATANT': {
      const current = findCombatant(state, command.id)
      if (!current) return notFound(command.id)
      const merged = { ...current, ...command.changes }
      // Current values never exceed the (possibly lowered) maximums.
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

    case 'SYNC_UNIT': {
      let next = state
      const events: BattleEvent[] = []
      for (const current of state.combatants) {
        if (current.unitId !== command.unitId) continue
        const changes = {
          ...command.sheet,
          name: renamedCopy(current.name, command.previousName, command.sheet.name),
        }
        // Saving a sheet without touching what the field uses changes nothing here.
        const keys = Object.keys(changes) as (keyof typeof changes)[]
        if (keys.every((k) => current[k] === changes[k])) continue
        const result = applyCommand(next, { type: 'UPDATE_COMBATANT', id: current.id, changes })
        if (!result.ok) return result
        next = result.state
        events.push(...result.events)
      }
      return ok(next, events)
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

    case 'PERFORM_ACTION':
      return performAction(state, command.action)

    case 'START_BATTLE':
      if (state.phase === 'active') return ok(state, [])
      return ok({ ...state, phase: 'active' }, [{ type: 'BATTLE_STARTED' }])

    case 'END_BATTLE': {
      const removedIds = state.combatants.map((c) => c.id)
      return ok(
        {
          ...state,
          name: '',
          phase: 'preparation',
          backgroundAssetId: null,
          combatants: [],
          presentation: mergePresentation(state.presentation, {
            revealAllEnemyStats: false,
            enemyPanel: { visible: false },
          }),
        },
        [{ type: 'BATTLE_ENDED', removedIds }],
      )
    }
  }
}
