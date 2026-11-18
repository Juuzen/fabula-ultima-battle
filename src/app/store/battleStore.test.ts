import { describe, expect, it, vi } from 'vitest'
import type { StateStorage } from 'zustand/middleware'

import { createCombatant, createEmptyBattle, type BattleState } from '@/domain'

import { BATTLE_STORAGE_KEY, createBattleStore, type BattleChange } from './battleStore'

function memoryStorage(initial: Record<string, string> = {}): StateStorage & {
  data: Record<string, string>
} {
  const data = { ...initial }
  return {
    data,
    getItem: (k) => data[k] ?? null,
    setItem: (k, v) => {
      data[k] = v
    },
    removeItem: (k) => {
      delete data[k]
    },
  }
}

const addHero = {
  type: 'ADD_COMBATANT',
  combatant: { id: 'hero', name: 'Hero', side: 'ally', maxHp: 40 },
} as const

describe('battle store', () => {
  it('applies commands and publishes the resulting change', () => {
    const store = createBattleStore({ storage: null })
    const changes: BattleChange[] = []
    store.changes.subscribe((c) => changes.push(c))

    store.getState().dispatch(addHero)
    store.getState().dispatch({ type: 'DAMAGE', id: 'hero', amount: 25 })

    expect(store.getState().battle.combatants[0]?.hp).toBe(15)
    expect(changes).toHaveLength(2)
    expect(changes[1]?.cause).toBe('command')
    expect(changes[1]?.events.map((e) => e.type)).toEqual(['DAMAGED', 'CRISIS_ENTERED'])
  })

  it('records domain errors without changing state', () => {
    const store = createBattleStore({ storage: null })
    const listener = vi.fn<(c: BattleChange) => void>()
    store.changes.subscribe(listener)

    const result = store.getState().dispatch({ type: 'DAMAGE', id: 'ghost', amount: 1 })

    expect(result.ok).toBe(false)
    expect(store.getState().lastError?.code).toBe('COMBATANT_NOT_FOUND')
    expect(store.getState().past).toEqual([])
    expect(listener).not.toHaveBeenCalled()

    store.getState().clearError()
    expect(store.getState().lastError).toBeNull()
  })

  it('undoes the last change and notifies with cause "undo"', () => {
    const store = createBattleStore({ storage: null })
    const changes: BattleChange[] = []
    store.changes.subscribe((c) => changes.push(c))

    store.getState().dispatch(addHero)
    store.getState().dispatch({ type: 'DAMAGE', id: 'hero', amount: 10 })
    store.getState().undo()

    expect(store.getState().battle.combatants[0]?.hp).toBe(40)
    expect(changes.at(-1)).toMatchObject({ cause: 'undo', events: [] })

    store.getState().undo()
    expect(store.getState().battle.combatants).toEqual([])
    store.getState().undo() // nothing left: no-op
    expect(changes).toHaveLength(4)
  })

  it('does not record no-op commands in history', () => {
    const store = createBattleStore({ storage: null })
    store.getState().dispatch(addHero)
    const status = { type: 'SET_STATUS', id: 'hero', status: 'slow', active: true } as const
    store.getState().dispatch(status)
    store.getState().dispatch(status)
    expect(store.getState().past).toHaveLength(2)
  })

  it('caps the undo history', () => {
    const store = createBattleStore({ storage: null, historyLimit: 3 })
    store.getState().dispatch(addHero)
    for (let i = 0; i < 5; i++) store.getState().dispatch({ type: 'DAMAGE', id: 'hero', amount: 1 })
    expect(store.getState().past).toHaveLength(3)
  })

  describe('persistence', () => {
    it('saves the battle (not the history) and restores it in a new store', () => {
      const storage = memoryStorage()
      const first = createBattleStore({ storage })
      first.getState().dispatch(addHero)
      first.getState().dispatch({ type: 'DAMAGE', id: 'hero', amount: 5 })

      const saved = JSON.parse(storage.data[BATTLE_STORAGE_KEY] ?? '{}')
      expect(Object.keys(saved.state)).toEqual(['battle'])

      const second = createBattleStore({ storage })
      expect(second.getState().battle.combatants[0]?.hp).toBe(35)
      expect(second.getState().past).toEqual([])
    })

    it('ignores corrupt persisted data', () => {
      vi.spyOn(console, 'warn').mockImplementation(() => {})
      const corrupt: BattleState = {
        ...createEmptyBattle(),
        combatants: [
          { ...createCombatant({ id: 'x', name: 'X', side: 'ally', maxHp: 5 }), hp: 99 },
        ],
      }
      const storage = memoryStorage({
        [BATTLE_STORAGE_KEY]: JSON.stringify({ state: { battle: corrupt }, version: 1 }),
      })

      const store = createBattleStore({ storage })
      expect(store.getState().battle).toEqual(createEmptyBattle())
    })
  })
})
