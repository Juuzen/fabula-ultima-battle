import { describe, expect, it } from 'vitest'

import type { Action, ActionTarget } from './action'
import { createEmptyBattle, type BattleState } from './battle'
import { createCombatant } from './combatant'
import { applyCommand } from './commands'
import { projectEventsForPlayers } from './projection'

function battle(phase: BattleState['phase'] = 'active'): BattleState {
  return {
    ...createEmptyBattle(),
    phase,
    combatants: [
      createCombatant({ id: 'mage', name: 'Maga', side: 'ally', maxHp: 30, maxMp: 40 }),
      createCombatant({ id: 'gob', name: 'Goblin', side: 'enemy', maxHp: 20 }),
      createCombatant({ id: 'wolf', name: 'Lupo', side: 'enemy', maxHp: 50, maxMp: 10 }),
    ],
  }
}

const hit = (
  id: string,
  amount: number,
  kind: NonNullable<ActionTarget['change']>['kind'] = 'damage',
  extra: Partial<ActionTarget> = {},
): ActionTarget => ({
  id,
  change: { kind, amount },
  addStatuses: [],
  removeStatuses: [],
  ...extra,
})

const action = (overrides: Partial<Action> = {}): Action => ({
  actorId: 'mage',
  name: 'Palla di fuoco',
  effect: 'fire',
  soundAssetId: null,
  mpCost: 10,
  targets: [hit('gob', 12), hit('wolf', 8)],
  ...overrides,
})

function perform(state: BattleState, a: Action) {
  const result = applyCommand(state, { type: 'PERFORM_ACTION', action: a })
  if (!result.ok) throw new Error(result.error.code)
  return result
}

const of = (s: BattleState, id: string) => s.combatants.find((c) => c.id === id)!

describe('PERFORM_ACTION', () => {
  it('spends the MP cost and hits every target with its own amount', () => {
    const { state, events } = perform(battle(), action())
    expect(of(state, 'mage').mp).toBe(30)
    expect(of(state, 'gob').hp).toBe(8)
    expect(of(state, 'wolf').hp).toBe(42)
    expect(events.map((e) => e.type)).toEqual([
      'ACTION_PERFORMED',
      'MP_SPENT',
      'DAMAGED',
      'CRISIS_ENTERED',
      'DAMAGED',
    ])
    expect(events[0]).toEqual({
      type: 'ACTION_PERFORMED',
      actorId: 'mage',
      name: 'Palla di fuoco',
      effect: 'fire',
      soundAssetId: null,
      targetIds: ['gob', 'wolf'],
    })
  })

  it('gives each target its own kind of outcome', () => {
    const hurt = applyCommand(battle(), { type: 'SET_HP', id: 'gob', hp: 5 })
    if (!hurt.ok) throw new Error()
    const drained = applyCommand(hurt.state, { type: 'SET_MP', id: 'wolf', mp: 2 })
    if (!drained.ok) throw new Error()
    const { state } = perform(
      drained.state,
      action({
        mpCost: 0,
        targets: [hit('gob', 10, 'heal'), hit('wolf', 4, 'mpRestore'), hit('mage', 3, 'mpDamage')],
      }),
    )
    expect(of(state, 'gob').hp).toBe(15)
    expect(of(state, 'wolf')).toMatchObject({ hp: 50, mp: 6 })
    expect(of(state, 'mage').mp).toBe(37)
  })

  it('adds and removes statuses per target, with or without a PV/PM change', () => {
    const poisoned = applyCommand(battle(), {
      type: 'SET_STATUS',
      id: 'wolf',
      status: 'poisoned',
      active: true,
    })
    if (!poisoned.ok) throw new Error()
    const { state, events } = perform(
      poisoned.state,
      action({
        targets: [
          hit('gob', 2, 'damage', { addStatuses: ['slow', 'weak'] }),
          { id: 'wolf', change: null, addStatuses: [], removeStatuses: ['poisoned'] },
        ],
      }),
    )
    expect(of(state, 'gob').statuses).toEqual(['slow', 'weak'])
    expect(of(state, 'wolf')).toMatchObject({ hp: 50, statuses: [] })
    expect(events.filter((e) => e.type === 'STATUS_CHANGED')).toEqual([
      { type: 'STATUS_CHANGED', id: 'gob', status: 'slow', active: true },
      { type: 'STATUS_CHANGED', id: 'gob', status: 'weak', active: true },
      { type: 'STATUS_CHANGED', id: 'wolf', status: 'poisoned', active: false },
    ])
  })

  it('can be the GM acting: no actor, no MP spent', () => {
    const { state, events } = perform(
      battle(),
      action({ actorId: null, name: 'Trappola', effect: null, mpCost: 0 }),
    )
    expect(of(state, 'mage').mp).toBe(40)
    expect(of(state, 'gob').hp).toBe(8)
    expect(events[0]).toEqual({
      type: 'ACTION_PERFORMED',
      actorId: null,
      name: 'Trappola',
      effect: null,
      soundAssetId: null,
      targetIds: ['gob', 'wolf'],
    })
  })

  it('works during preparation, but the players get no sequence', () => {
    const { state, events } = perform(battle('preparation'), action())
    expect(of(state, 'gob').hp).toBe(8)
    expect(projectEventsForPlayers(events, state)).toEqual([])
  })

  it('is all or nothing: one unknown target leaves the state untouched', () => {
    const result = applyCommand(battle(), {
      type: 'PERFORM_ACTION',
      action: action({ targets: [hit('gob', 5), hit('ghost', 5)] }),
    })
    expect(result).toMatchObject({ ok: false, error: { code: 'COMBATANT_NOT_FOUND' } })
  })

  it('refuses actions the actor cannot pay for', () => {
    const result = applyCommand(battle(), {
      type: 'PERFORM_ACTION',
      action: action({ mpCost: 41 }),
    })
    expect(result).toMatchObject({ ok: false, error: { code: 'NOT_ENOUGH_MP' } })
  })

  it.each([
    ['no targets', { targets: [] }],
    ['duplicate targets', { targets: [hit('gob', 1), hit('gob', 2)] }],
    ['negative amount', { targets: [hit('gob', -1)] }],
    ['unknown effect', { effect: 'meteor' as Action['effect'] }],
    [
      'a target with no effect',
      { targets: [{ id: 'gob', change: null, addStatuses: [], removeStatuses: [] }] },
    ],
    [
      'a status both added and removed',
      { targets: [hit('gob', 1, 'damage', { addStatuses: ['slow'], removeStatuses: ['slow'] })] },
    ],
    ['MP spent by nobody', { actorId: null, mpCost: 3 }],
  ])('rejects invalid actions: %s', (_, overrides) => {
    const result = applyCommand(battle(), {
      type: 'PERFORM_ACTION',
      action: action(overrides as Partial<Action>),
    })
    expect(result).toMatchObject({ ok: false, error: { code: 'INVALID_ACTION' } })
  })

  it('lets the actor target itself (e.g. a self-heal)', () => {
    const { state } = perform(battle(), action({ mpCost: 5, targets: [hit('mage', 3, 'heal')] }))
    expect(of(state, 'mage')).toMatchObject({ mp: 35, hp: 30 })
  })
})
