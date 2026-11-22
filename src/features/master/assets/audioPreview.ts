import { create } from 'zustand'

import { libraryAssetSource } from '@/app/library/assetSource'

/**
 * Lets the GM listen to a track or a sound in the dashboard (on the GM's own speakers, not
 * the player screen). One at a time: starting another stops the previous one.
 */
type AudioPreviewState = {
  playingId: string | null
  toggle: (assetId: string) => void
  stop: () => void
}

let element: HTMLAudioElement | null = null

export const useAudioPreview = create<AudioPreviewState>()((set, get) => ({
  playingId: null,
  toggle(assetId) {
    const wasPlaying = get().playingId === assetId
    get().stop()
    if (wasPlaying) return
    const asset = libraryAssetSource.peek(assetId)
    if (!asset) {
      // Not loaded yet: load it, then try again once.
      libraryAssetSource.load(assetId)
      const unsubscribe = libraryAssetSource.subscribe(() => {
        if (libraryAssetSource.peek(assetId) === undefined) return
        unsubscribe()
        if (libraryAssetSource.peek(assetId)) get().toggle(assetId)
      })
      return
    }
    element = new Audio(asset.url)
    element.onended = () => set({ playingId: null })
    element.play().catch(() => set({ playingId: null }))
    set({ playingId: assetId })
  },
  stop() {
    element?.pause()
    element = null
    set({ playingId: null })
  },
}))
