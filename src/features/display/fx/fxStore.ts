import { create } from 'zustand'

import type { BattleEvent } from '@/domain'

import { eventsToFx, type Fx } from './fx'

/** Safety cap: if the tab was in background, stale effects must not pile up. */
const MAX_ACTIVE_FX = 40

type FxStoreState = {
  items: Fx[]
  nextId: number
  push: (events: readonly BattleEvent[]) => void
  remove: (id: number) => void
  clear: () => void
}

/** Queue of visual effects currently playing on the Display. */
export const useFxStore = create<FxStoreState>()((set) => ({
  items: [],
  nextId: 1,
  push: (events) =>
    set((s) => {
      const fx = eventsToFx(events, s.nextId, s.items)
      if (fx.length === 0) return s
      return { items: [...s.items, ...fx].slice(-MAX_ACTIVE_FX), nextId: s.nextId + fx.length }
    }),
  remove: (id) => set((s) => ({ items: s.items.filter((f) => f.id !== id) })),
  clear: () => set({ items: [] }),
}))
