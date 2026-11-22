import { useEffect } from 'react'
import { create } from 'zustand'

import { useCustomEffects, useSoundSettings } from '@/app/library/assetHooks'
import { createDefaultSoundSettings, type CustomEffect, type SoundSettings } from '@/domain'

/**
 * What the Display reads from the library besides files: the GM's custom effects (timing,
 * size, sound) and the sound settings. Kept in a store so the sequencer, which lives outside
 * React, always sees the latest values.
 */
type LibraryFeed = {
  customEffects: ReadonlyMap<string, CustomEffect>
  sounds: SoundSettings
}

export const useLibraryFeed = create<LibraryFeed>()(() => ({
  customEffects: new Map(),
  sounds: createDefaultSoundSettings(),
}))

/** Keeps the feed in step with the library (live: edits in the Master show up at once). */
export function useLibraryFeedSync() {
  const effects = useCustomEffects()
  const sounds = useSoundSettings()
  useEffect(() => {
    if (effects) useLibraryFeed.setState({ customEffects: new Map(effects.map((e) => [e.id, e])) })
  }, [effects])
  useEffect(() => {
    useLibraryFeed.setState({ sounds })
  }, [sounds])
}
