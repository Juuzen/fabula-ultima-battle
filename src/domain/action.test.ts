import { describe, expect, it } from 'vitest'

import type { Action } from './action'
import { createEmptyBattle, type BattleState } from './battle'
import { createCombatant } from './combatant'
import { applyCommand } from './commands'

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

const action = (overrides: Partial<Action> = {}): Action => ({
  actorId: 'mage',
  name: 'Palla di fuoco',
  effect: 'fire',
  kind: 'damage',
  mpCost: 10,
  statuses: [],
  targets: [
    { id: 'gob', amount: 12 },
    { id: 'wolf', amount: 8 },
  ],
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
      kind: 'damage',
      targetIds: ['gob', 'wolf'],
    })
  })

  it('heals instead of damaging', () => {
    const hurt = applyCommand(battle(), { type: 'SET_HP', id: 'gob', hp: 5 })
    if (!hurt.ok) throw new Error()
    const { state } = perform(
      hurt.state,
      action({ kind: 'heal', mpCost: 0, effect: 'light', targets: [{ id: 'gob', amount: 10 }] }),
    )
    expect(of(state, 'gob').hp).toBe(15)
  })

  it('damages MP instead of HP', () => {
    const { state, events } = perform(
      battle(),
      action({ kind: 'mpDamage', mpCost: 0, targets: [{ id: 'wolf', amount: 4 }] }),
    )
    expect(of(state, 'wolf')).toMatchObject({ hp: 50, mp: 6 })
    expect(events.at(-1)).toEqual({ type: 'MP_SPENT', id: 'wolf', amount: 4, mp: 6 })
  })

  it('applies statuses to every target on impact', () => {
    const { state, events } = perform(battle(), action({ statuses: ['poisoned', 'slow'] }))
    expect(of(state, 'gob').statuses).toEqual(['poisoned', 'slow'])
    expect(of(state, 'wolf').statuses).toEqual(['poisoned', 'slow'])
    expect(events.filter((e) => e.type === 'STATUS_CHANGED')).toHaveLength(4)
  })

  it('is all or nothing: one unknown target leaves the state untouched', () => {
    const before = battle()
    const result = applyCommand(before, {
      type: 'PERFORM_ACTION',
      action: action({
        targets: [
          { id: 'gob', amount: 5 },
          { id: 'ghost', amount: 5 },
        ],
      }),
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

  it('needs a battle in progress (no leaks during preparation)', () => {
    const result = applyCommand(battle('preparation'), {
      type: 'PERFORM_ACTION',
      action: action(),
    })
    expect(result).toMatchObject({ ok: false, error: { code: 'BATTLE_NOT_ACTIVE' } })
  })

  it.each([
    ['no targets', { targets: [] }],
    [
      'duplicate targets',
      {
        targets: [
          { id: 'gob', amount: 1 },
          { id: 'gob', amount: 2 },
        ],
      },
    ],
    ['negative amount', { targets: [{ id: 'gob', amount: -1 }] }],
    ['unknown effect', { effect: 'meteor' as Action['effect'] }],
  ])('rejects invalid actions: %s', (_, overrides) => {
    const result = applyCommand(battle(), {
      type: 'PERFORM_ACTION',
      action: action(overrides as Partial<Action>),
    })
    expect(result).toMatchObject({ ok: false, error: { code: 'INVALID_ACTION' } })
  })

  it('lets the actor target itself (e.g. a self-heal)', () => {
    const { state } = perform(
      battle(),
      action({ kind: 'heal', mpCost: 5, targets: [{ id: 'mage', amount: 3 }] }),
    )
    expect(of(state, 'mage')).toMatchObject({ mp: 35, hp: 30 })
  })
})
