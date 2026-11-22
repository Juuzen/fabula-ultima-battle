import { useStore } from 'zustand'
import { useShallow } from 'zustand/shallow'

import { combatantsOnSide, findCombatant, type Combatant, type Side } from '@/domain'

import { createBattleStore, type BattleStoreState, type HistoryEntry } from './battleStore'

export * from './battleStore'

/**
 * The Master's authoritative battle store. Only the Master window should read or write it:
 * the Display receives state through the sync layer, never from storage.
 */
export const battleStore = createBattleStore()

export function useBattleStore<T>(selector: (state: BattleStoreState) => T): T {
  return useStore(battleStore, selector)
}

/** Commands are stable references: safe to use in effects and callbacks. */
export function useBattleActions() {
  return useBattleStore(
    useShallow((s) => ({ dispatch: s.dispatch, undo: s.undo, clearError: s.clearError })),
  )
}

export function useCombatants(side: Side): Combatant[] {
  return useBattleStore(useShallow((s) => combatantsOnSide(s.battle, side)))
}

export function useCombatant(id: string): Combatant | undefined {
  return useBattleStore((s) => findCombatant(s.battle, id))
}

export function useCanUndo(): boolean {
  return useBattleStore((s) => s.past.length > 0)
}

/** The step `undo()` would revert, or undefined when history is empty. */
export function useLastHistoryEntry(): HistoryEntry | undefined {
  return useBattleStore((s) => s.past.at(-1))
}
