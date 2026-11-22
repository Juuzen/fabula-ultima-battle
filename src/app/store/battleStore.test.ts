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
    expect(changes[1]?.events.map((e) => e.type)).toEqual(['DAMAGED', 'CRISIS_ENTERED'])
  })

  it('records domain errors without changing state', () => {
    const store = createBattleStore({ storage: null })
    const listener = vi.fn<(c: BattleChange) => void>()
    store.changes.subscribe(listener)

    const result = store.getState().dispatch({ type: 'DAMAGE', id: 'ghost', amount: 1 })

    expect(result.ok).toBe(false)
    expect(store.getState().lastError?.code).toBe('COMBATANT_NOT_FOUND')
    expect(listener).not.toHaveBeenCalled()

    store.getState().clearError()
    expect(store.getState().lastError).toBeNull()
  })

  it('publishes nothing for no-op commands', () => {
    const store = createBattleStore({ storage: null })
    const listener = vi.fn<(c: BattleChange) => void>()
    store.getState().dispatch(addHero)
    store.changes.subscribe(listener)
    const status = { type: 'SET_STATUS', id: 'hero', status: 'slow', active: true } as const
    store.getState().dispatch(status)
    store.getState().dispatch(status)
    expect(listener).toHaveBeenCalledTimes(1)
  })

  describe('persistence', () => {
    it('saves the battle and restores it in a new store', () => {
      const storage = memoryStorage()
      const first = createBattleStore({ storage })
      first.getState().dispatch(addHero)
      first.getState().dispatch({ type: 'DAMAGE', id: 'hero', amount: 5 })

      const saved = JSON.parse(storage.data[BATTLE_STORAGE_KEY] ?? '{}')
      expect(Object.keys(saved.state)).toEqual(['battle'])

      const second = createBattleStore({ storage })
      expect(second.getState().battle.combatants[0]?.hp).toBe(35)
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
        [BATTLE_STORAGE_KEY]: JSON.stringify({ state: { battle: corrupt }, version: 4 }),
      })

      const store = createBattleStore({ storage })
      expect(store.getState().battle).toEqual(createEmptyBattle())
    })

    it('upgrades a v1 save (no MP, portraits or presentation settings)', () => {
      const v1 = {
        name: 'Old',
        backgroundAssetId: null,
        combatants: [
          {
            id: 'h',
            name: 'Hero',
            side: 'ally',
            maxHp: 30,
            hp: 12,
            statuses: ['slow'],
            spriteAssetId: null,
            flipSprite: false,
          },
        ],
      }
      const storage = memoryStorage({
        [BATTLE_STORAGE_KEY]: JSON.stringify({ state: { battle: v1 }, version: 1 }),
      })

      const store = createBattleStore({ storage })
      const hero = store.getState().battle.combatants[0]
      expect(hero).toMatchObject({
        hp: 12,
        maxMp: 0,
        mp: 0,
        revealStats: false,
        statuses: ['slow'],
      })
      expect(store.getState().battle.presentation.enemyPanel.mode).toBe('auto')
      expect(store.getState().battle.phase).toBe('preparation') // no enemies in that save
    })

    it('treats a v2 save with enemies on the field as an active battle', () => {
      const v2 = {
        ...createEmptyBattle(),
        combatants: [createCombatant({ id: 'o', name: 'Orc', side: 'enemy', maxHp: 10 })],
      } as Partial<BattleState>
      delete v2.phase
      const storage = memoryStorage({
        [BATTLE_STORAGE_KEY]: JSON.stringify({ state: { battle: v2 }, version: 2 }),
      })
      expect(createBattleStore({ storage }).getState().battle.phase).toBe('active')
    })

    it('upgrades a v3 save with the default waiting background', () => {
      const v3 = structuredClone(createEmptyBattle()) as BattleState
      delete (v3.presentation as Partial<BattleState['presentation']>).waitingBackgroundAssetId
      const storage = memoryStorage({
        [BATTLE_STORAGE_KEY]: JSON.stringify({ state: { battle: v3 }, version: 3 }),
      })
      const presentation = createBattleStore({ storage }).getState().battle.presentation
      expect(presentation.waitingBackgroundAssetId).toBeNull()
    })

    it('upgrades a v4 save: combatants come from no library sheet', () => {
      const hero = createCombatant({ id: 'hero', name: 'Hero', side: 'ally', maxHp: 40 })
      const { unitId: _dropped, ...v4Hero } = hero
      const storage = memoryStorage({
        [BATTLE_STORAGE_KEY]: JSON.stringify({
          state: { battle: { ...createEmptyBattle(), combatants: [v4Hero] } },
          version: 4,
        }),
      })
      const [restored] = createBattleStore({ storage }).getState().battle.combatants
      expect(restored).toMatchObject({ id: 'hero', unitId: null })
    })

    it('upgrades a v5 save with default music settings', () => {
      const { audio: _dropped, ...v5Presentation } = createEmptyBattle().presentation
      const storage = memoryStorage({
        [BATTLE_STORAGE_KEY]: JSON.stringify({
          state: { battle: { ...createEmptyBattle(), presentation: v5Presentation } },
          version: 5,
        }),
      })
      const { audio } = createBattleStore({ storage }).getState().battle.presentation
      expect(audio).toEqual({ musicAssetId: null, musicVolume: 70, sfxVolume: 80, muted: false })
    })
  })
})
