import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  applyCommand,
  createCombatant,
  createEmptyBattle,
  type BattleCommand,
  type BattleState,
  type EnemyPanel,
} from '@/domain'

import { useEnemyPanelVisibility } from './useEnemyPanelVisibility'

function battle(panel: Partial<EnemyPanel> = {}): BattleState {
  const base = createEmptyBattle()
  return {
    ...base,
    presentation: {
      ...base.presentation,
      enemyPanel: { ...base.presentation.enemyPanel, ...panel },
    },
    combatants: [
      createCombatant({ id: 'hero', name: 'Hero', side: 'ally', maxHp: 30 }),
      createCombatant({ id: 'orc', name: 'Orc', side: 'enemy', maxHp: 30 }),
    ],
  }
}

function apply(state: BattleState, command: BattleCommand): BattleState {
  const result = applyCommand(state, command)
  if (!result.ok) throw new Error(result.error.message)
  return result.state
}

describe('useEnemyPanelVisibility', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('manual mode follows the GM flag only', () => {
    const initial = battle({ mode: 'manual', visible: false })
    const { result, rerender } = renderHook(({ b }) => useEnemyPanelVisibility(b), {
      initialProps: { b: initial },
    })
    expect(result.current).toBe(false)

    rerender({ b: apply(initial, { type: 'DAMAGE', id: 'orc', amount: 5 }) })
    expect(result.current).toBe(false) // changes do not pop it in manual mode

    rerender({ b: battle({ mode: 'manual', visible: true }) })
    expect(result.current).toBe(true)
  })

  it('auto mode stays hidden at start, pops on enemy changes and hides after the delay', () => {
    const initial = battle({ mode: 'auto', autoHideSeconds: 3 })
    const { result, rerender } = renderHook(({ b }) => useEnemyPanelVisibility(b), {
      initialProps: { b: initial },
    })
    expect(result.current).toBe(false)

    const hurt = apply(initial, { type: 'DAMAGE', id: 'orc', amount: 5 })
    rerender({ b: hurt })
    expect(result.current).toBe(true)

    act(() => vi.advanceTimersByTime(2999))
    expect(result.current).toBe(true)
    act(() => vi.advanceTimersByTime(1))
    expect(result.current).toBe(false)
  })

  it('each new change restarts the countdown', () => {
    const initial = battle({ mode: 'auto', autoHideSeconds: 3 })
    const { result, rerender } = renderHook(({ b }) => useEnemyPanelVisibility(b), {
      initialProps: { b: initial },
    })
    const first = apply(initial, { type: 'SET_STATUS', id: 'orc', status: 'slow', active: true })
    rerender({ b: first })
    act(() => vi.advanceTimersByTime(2000))

    rerender({ b: apply(first, { type: 'DAMAGE', id: 'orc', amount: 1 }) })
    act(() => vi.advanceTimersByTime(2000))
    expect(result.current).toBe(true) // 4s after the first change, 2s after the second

    act(() => vi.advanceTimersByTime(1000))
    expect(result.current).toBe(false)
  })

  it('ignores changes that only concern the party', () => {
    const initial = battle({ mode: 'auto' })
    const { result, rerender } = renderHook(({ b }) => useEnemyPanelVisibility(b), {
      initialProps: { b: initial },
    })
    rerender({ b: apply(initial, { type: 'DAMAGE', id: 'hero', amount: 5 }) })
    expect(result.current).toBe(false)
  })

  it('revealing stats counts as a change the players can see', () => {
    const initial = battle({ mode: 'auto' })
    const { result, rerender } = renderHook(({ b }) => useEnemyPanelVisibility(b), {
      initialProps: { b: initial },
    })
    rerender({ b: apply(initial, { type: 'SET_REVEAL_STATS', id: 'orc', reveal: true }) })
    expect(result.current).toBe(true)
  })
})
