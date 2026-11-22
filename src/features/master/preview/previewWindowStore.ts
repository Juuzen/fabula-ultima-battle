import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

export const PREVIEW_MIN_WIDTH = 280
export const PREVIEW_DEFAULT_WIDTH = 440

/**
 * The floating player-screen preview: open or not, rolled up or not, where it sits and how
 * wide it is (the height follows, 16:9). A per-browser convenience: kept in localStorage,
 * never part of the battle.
 */
type PreviewWindowState = {
  open: boolean
  minimized: boolean
  /** Top-left corner in viewport px; null = not moved yet (docked bottom-right). */
  position: { x: number; y: number } | null
  width: number
  toggle: () => void
  close: () => void
  setMinimized: (minimized: boolean) => void
  moveTo: (x: number, y: number) => void
  resizeTo: (width: number) => void
}

export const usePreviewWindow = create<PreviewWindowState>()(
  persist(
    (set) => ({
      open: true,
      minimized: false,
      position: null,
      width: PREVIEW_DEFAULT_WIDTH,
      toggle: () => set((s) => ({ open: !s.open, minimized: s.open ? s.minimized : false })),
      close: () => set({ open: false }),
      setMinimized: (minimized) => set({ minimized }),
      moveTo: (x, y) => set({ position: { x: Math.round(x), y: Math.round(y) } }),
      resizeTo: (width) => set({ width: Math.round(Math.max(PREVIEW_MIN_WIDTH, width)) }),
    }),
    {
      name: 'fu-battle.preview-window',
      version: 1,
      // createJSONStorage swallows an unavailable localStorage: the preview still works.
      storage: createJSONStorage(() => localStorage),
      partialize: ({ open, minimized, position, width }) => ({ open, minimized, position, width }),
    },
  ),
)
