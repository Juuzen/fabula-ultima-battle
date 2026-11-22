import { describe, expect, it } from 'vitest'

import { createEmptyBattle, type BattleState } from './battle'
import { createCombatant } from './combatant'
import { applyCommand, type BattleCommand, type CommandResult } from './commands'

function battleWith(): BattleState {
  return {
    ...createEmptyBattle('Test'),
    combatants: [
      createCombatant({ id: 'hero', name: 'Hero', side: 'ally', maxHp: 40 }),
      createCombatant({ id: 'mage', name: 'Mage', side: 'ally', maxHp: 30, maxMp: 40 }),
      createCombatant({ id: 'gob1', name: 'Goblin', side: 'enemy', maxHp: 20 }),
      createCombatant({ id: 'gob2', name: 'Goblin', side: 'enemy', maxHp: 20 }),
    ],
  }
}

function run(state: BattleState, command: BattleCommand) {
  const result: CommandResult = applyCommand(state, command)
  if (!result.ok) throw new Error(`Unexpected failure: ${result.error.message}`)
  return result
}

const hpOf = (s: BattleState, id: string) => s.combatants.find((c) => c.id === id)?.hp

describe('applyCommand', () => {
  it('never mutates the input state', () => {
    const state = battleWith()
    const snapshot = structuredClone(state)
    applyCommand(state, { type: 'DAMAGE', id: 'hero', amount: 10 })
    applyCommand(state, { type: 'SET_STATUS', id: 'hero', status: 'slow', active: true })
    applyCommand(state, { type: 'MOVE_COMBATANT', id: 'mage', toIndex: 0 })
    expect(state).toEqual(snapshot)
  })

  describe('ADD_COMBATANT', () => {
    it('adds with defaults and emits COMBATANT_ADDED', () => {
      const { state, events } = run(createEmptyBattle(), {
        type: 'ADD_COMBATANT',
        combatant: { id: 'x', name: 'Slime', side: 'enemy', maxHp: 12 },
      })
      expect(state.combatants).toHaveLength(1)
      expect(state.combatants[0]?.hp).toBe(12)
      expect(events).toEqual([{ type: 'COMBATANT_ADDED', combatant: state.combatants[0] }])
    })

    it('rejects duplicate ids and invalid data', () => {
      const dup = applyCommand(battleWith(), {
        type: 'ADD_COMBATANT',
        combatant: { id: 'hero', name: 'Clone', side: 'ally', maxHp: 10 },
      })
      expect(dup).toMatchObject({ ok: false, error: { code: 'DUPLICATE_ID' } })

      const bad = applyCommand(createEmptyBattle(), {
        type: 'ADD_COMBATANT',
        combatant: { id: 'x', name: 'Ghost', side: 'enemy', maxHp: 0 },
      })
      expect(bad).toMatchObject({ ok: false, error: { code: 'INVALID_COMBATANT' } })
    })
  })

  describe('DAMAGE', () => {
    it('reduces HP and reports the applied amount', () => {
      const { state, events } = run(battleWith(), { type: 'DAMAGE', id: 'hero', amount: 5 })
      expect(hpOf(state, 'hero')).toBe(35)
      expect(events).toEqual([{ type: 'DAMAGED', id: 'hero', amount: 5, hp: 35 }])
    })

    it('emits CRISIS_ENTERED when crossing half max HP', () => {
      const { events } = run(battleWith(), { type: 'DAMAGE', id: 'hero', amount: 20 })
      expect(events.map((e) => e.type)).toEqual(['DAMAGED', 'CRISIS_ENTERED'])
    })

    it('clamps overkill at 0 and emits KNOCKED_OUT (not Crisis)', () => {
      const { state, events } = run(battleWith(), { type: 'DAMAGE', id: 'gob1', amount: 99 })
      expect(hpOf(state, 'gob1')).toBe(0)
      expect(events).toEqual([
        { type: 'DAMAGED', id: 'gob1', amount: 20, hp: 0 },
        { type: 'KNOCKED_OUT', id: 'gob1' },
      ])
    })

    it('goes from Crisis to KO with CRISIS_EXITED', () => {
      const inCrisis = run(battleWith(), { type: 'SET_HP', id: 'gob1', hp: 5 }).state
      const { events } = run(inCrisis, { type: 'DAMAGE', id: 'gob1', amount: 5 })
      expect(events.map((e) => e.type)).toEqual(['DAMAGED', 'KNOCKED_OUT', 'CRISIS_EXITED'])
    })

    it.each([-1, 2.5, Number.NaN])('rejects invalid amount %s', (amount) => {
      const result = applyCommand(battleWith(), { type: 'DAMAGE', id: 'hero', amount })
      expect(result).toMatchObject({ ok: false, error: { code: 'INVALID_AMOUNT' } })
    })

    it('fails for unknown targets', () => {
      const result = applyCommand(battleWith(), { type: 'DAMAGE', id: 'nobody', amount: 1 })
      expect(result).toMatchObject({ ok: false, error: { code: 'COMBATANT_NOT_FOUND' } })
    })
  })

  describe('HEAL', () => {
    it('clamps overheal at max HP and reports the applied amount', () => {
      const hurt = run(battleWith(), { type: 'DAMAGE', id: 'hero', amount: 3 }).state
      const { state, events } = run(hurt, { type: 'HEAL', id: 'hero', amount: 50 })
      expect(hpOf(state, 'hero')).toBe(40)
      expect(events).toEqual([{ type: 'HEALED', id: 'hero', amount: 3, hp: 40 }])
    })

    it('revives a knocked-out combatant into Crisis', () => {
      const ko = run(battleWith(), { type: 'SET_HP', id: 'hero', hp: 0 }).state
      const { events } = run(ko, { type: 'HEAL', id: 'hero', amount: 1 })
      expect(events.map((e) => e.type)).toEqual(['HEALED', 'REVIVED', 'CRISIS_ENTERED'])
    })
  })

  describe('UPDATE_COMBATANT', () => {
    it('lowering max HP drags HP down and may trigger Crisis', () => {
      const hurt = run(battleWith(), { type: 'SET_HP', id: 'hero', hp: 25 }).state
      const { state, events } = run(hurt, {
        type: 'UPDATE_COMBATANT',
        id: 'hero',
        changes: { maxHp: 60 },
      })
      expect(hpOf(state, 'hero')).toBe(25)
      expect(events.map((e) => e.type)).toEqual(['COMBATANT_UPDATED', 'CRISIS_ENTERED'])

      const lowered = run(state, { type: 'UPDATE_COMBATANT', id: 'hero', changes: { maxHp: 10 } })
      expect(hpOf(lowered.state, 'hero')).toBe(10)
    })
  })

  it('UPDATE_COMBATANT edits current HP/MP in a single step, clamped to the maximums', () => {
    const { state, events } = run(battleWith(), {
      type: 'UPDATE_COMBATANT',
      id: 'mage',
      changes: { name: 'Archmage', maxHp: 36, hp: 10, mp: 99 },
    })
    const mage = state.combatants.find((c) => c.id === 'mage')
    expect(mage).toMatchObject({ name: 'Archmage', maxHp: 36, hp: 10, mp: 40 })
    expect(events.map((e) => e.type)).toEqual(['COMBATANT_UPDATED', 'CRISIS_ENTERED'])
  })

  describe('SET_STATUS', () => {
    it('adds and removes statuses, idempotently', () => {
      const added = run(battleWith(), {
        type: 'SET_STATUS',
        id: 'hero',
        status: 'poisoned',
        active: true,
      })
      expect(added.state.combatants[0]?.statuses).toEqual(['poisoned'])
      expect(added.events).toHaveLength(1)

      const again = run(added.state, {
        type: 'SET_STATUS',
        id: 'hero',
        status: 'poisoned',
        active: true,
      })
      expect(again.events).toEqual([])
      expect(again.state).toBe(added.state)

      const removed = run(added.state, {
        type: 'SET_STATUS',
        id: 'hero',
        status: 'poisoned',
        active: false,
      })
      expect(removed.state.combatants[0]?.statuses).toEqual([])
    })

    it('is purely visual: HP is untouched', () => {
      const { state } = run(battleWith(), {
        type: 'SET_STATUS',
        id: 'hero',
        status: 'weak',
        active: true,
      })
      expect(hpOf(state, 'hero')).toBe(40)
    })
  })

  describe('MOVE_COMBATANT', () => {
    it('reorders within the same side only', () => {
      const { state } = run(battleWith(), { type: 'MOVE_COMBATANT', id: 'gob2', toIndex: 0 })
      expect(state.combatants.map((c) => c.id)).toEqual(['hero', 'mage', 'gob2', 'gob1'])
    })

    it('clamps out-of-range indexes', () => {
      const { state, events } = run(battleWith(), {
        type: 'MOVE_COMBATANT',
        id: 'hero',
        toIndex: 99,
      })
      expect(state.combatants.map((c) => c.id)).toEqual(['mage', 'hero', 'gob1', 'gob2'])
      expect(events).toEqual([{ type: 'COMBATANT_MOVED', id: 'hero', toIndex: 1 }])
    })
  })

  it('REMOVE_COMBATANT removes and emits', () => {
    const { state, events } = run(battleWith(), { type: 'REMOVE_COMBATANT', id: 'mage' })
    expect(state.combatants.map((c) => c.id)).toEqual(['hero', 'gob1', 'gob2'])
    expect(events).toEqual([{ type: 'COMBATANT_REMOVED', id: 'mage' }])
  })

  it('LOAD_BATTLE validates the incoming state', () => {
    const good = run(createEmptyBattle(), { type: 'LOAD_BATTLE', state: battleWith() })
    expect(good.state.combatants).toHaveLength(4)

    const broken = { ...battleWith(), combatants: [...battleWith().combatants] }
    broken.combatants.push(broken.combatants[0]!)
    const bad = applyCommand(createEmptyBattle(), { type: 'LOAD_BATTLE', state: broken })
    expect(bad).toMatchObject({ ok: false, error: { code: 'INVALID_BATTLE' } })
  })

  describe('MP', () => {
    const mpOf = (st: BattleState, id: string) => st.combatants.find((c) => c.id === id)?.mp

    it('spends and restores MP, clamped and without Crisis side effects', () => {
      const spent = run(battleWith(), { type: 'SPEND_MP', id: 'mage', amount: 30 })
      expect(mpOf(spent.state, 'mage')).toBe(10)
      expect(spent.events).toEqual([{ type: 'MP_SPENT', id: 'mage', amount: 30, mp: 10 }])

      const restored = run(spent.state, { type: 'RESTORE_MP', id: 'mage', amount: 99 })
      expect(restored.events).toEqual([{ type: 'MP_RESTORED', id: 'mage', amount: 30, mp: 40 }])
    })

    it('cannot go below zero and SET_MP clamps to the maximum', () => {
      const { state } = run(battleWith(), { type: 'SPEND_MP', id: 'mage', amount: 99 })
      expect(mpOf(state, 'mage')).toBe(0)
      const set = run(state, { type: 'SET_MP', id: 'mage', mp: 500 })
      expect(set.events).toEqual([{ type: 'MP_SET', id: 'mage', mp: 40 }])
    })

    it('lowering max MP drags MP down', () => {
      const { state } = run(battleWith(), {
        type: 'UPDATE_COMBATANT',
        id: 'mage',
        changes: { maxMp: 15 },
      })
      expect(mpOf(state, 'mage')).toBe(15)
    })
  })

  describe('enemy info visibility', () => {
    it('SET_REVEAL_STATS toggles a single combatant, idempotently', () => {
      const shown = run(battleWith(), { type: 'SET_REVEAL_STATS', id: 'gob1', reveal: true })
      expect(shown.state.combatants.find((c) => c.id === 'gob1')?.revealStats).toBe(true)
      expect(shown.events).toEqual([{ type: 'STATS_REVEAL_CHANGED', id: 'gob1', reveal: true }])
      expect(
        run(shown.state, { type: 'SET_REVEAL_STATS', id: 'gob1', reveal: true }).events,
      ).toEqual([])
    })

    it('SET_PRESENTATION merges partial changes', () => {
      const { state, events } = run(battleWith(), {
        type: 'SET_PRESENTATION',
        changes: { enemyPanel: { mode: 'manual', visible: true } },
      })
      expect(state.presentation.enemyPanel).toEqual({
        mode: 'manual',
        visible: true,
        autoHideSeconds: 6,
      })
      expect(events[0]?.type).toBe('PRESENTATION_CHANGED')
    })

    it('SET_PRESENTATION rejects an out-of-range auto-hide delay', () => {
      const result = applyCommand(battleWith(), {
        type: 'SET_PRESENTATION',
        changes: { enemyPanel: { autoHideSeconds: 0 } },
      })
      expect(result).toMatchObject({ ok: false, error: { code: 'INVALID_PRESENTATION' } })
    })
  })

  describe('battle phase', () => {
    it('starts in preparation; START_BATTLE makes it active (idempotent)', () => {
      expect(createEmptyBattle().phase).toBe('preparation')
      const started = run(battleWith(), { type: 'START_BATTLE' })
      expect(started.state.phase).toBe('active')
      expect(started.events).toEqual([{ type: 'BATTLE_STARTED' }])
      expect(run(started.state, { type: 'START_BATTLE' }).events).toEqual([])
    })

    it('END_BATTLE goes back to preparation', () => {
      const started = run(battleWith(), { type: 'START_BATTLE' }).state
      expect(run(started, { type: 'END_BATTLE' }).state.phase).toBe('preparation')
    })
  })

  it('END_BATTLE empties the field, clears the scene and resets enemy visibility', () => {
    const prepared = run(battleWith(), {
      type: 'SET_PRESENTATION',
      changes: { revealAllEnemyStats: true, enemyPanel: { visible: true } },
    }).state
    const { state, events } = run(prepared, { type: 'END_BATTLE' })
    expect(state.combatants).toEqual([])
    expect(state.name).toBe('')
    expect(state.backgroundAssetId).toBeNull()
    expect(state.presentation.revealAllEnemyStats).toBe(false)
    expect(state.presentation.enemyPanel.visible).toBe(false)
    expect(events).toEqual([{ type: 'BATTLE_ENDED', removedIds: ['hero', 'mage', 'gob1', 'gob2'] }])
  })
})
