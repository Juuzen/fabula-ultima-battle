import { create } from 'zustand'

import type { BattleState } from '@/domain'

/**
 * What the Display currently shows. It is NOT the authoritative state: the sync layer
 * (phase 4) writes snapshots here, and the choreography (phase 6) will lag it on purpose.
 */
type DisplayStoreState = {
  battle: BattleState | null
  showBattle: (battle: BattleState | null) => void
}

export const useDisplayStore = create<DisplayStoreState>()((set) => ({
  battle: null,
  showBattle: (battle) => set({ battle }),
}))
