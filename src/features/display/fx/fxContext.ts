import { createContext, useContext } from 'react'

import type { CombatantId } from '@/domain'

import { HIT_KINDS, type Fx } from './fx'

export type FxApi = { items: readonly Fx[]; remove: (id: number) => void }

/**
 * Effects reach the scene through context, so the same BattleScene can be used with
 * effects (the Display) or without (the Master's preview, which has none by default).
 */
export const FxContext = createContext<FxApi>({ items: [], remove: () => {} })

export function useFx(): FxApi {
  return useContext(FxContext)
}

/** Latest effect that should make this combatant's sprite react, if any. */
export function useLatestHit(targetId: CombatantId): Fx | undefined {
  const { items } = useFx()
  for (let i = items.length - 1; i >= 0; i--) {
    const fx = items[i]!
    if (fx.targetId === targetId && HIT_KINDS.has(fx.kind)) return fx
  }
  return undefined
}
