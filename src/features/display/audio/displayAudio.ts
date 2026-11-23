import { useEffect } from 'react'

import { library } from '@/app/library/library'
import { soundCues, type BattleEvent, type BattleState } from '@/domain'
import { createAudioEngine, type AudioEngine } from '@/infra/audio/audioEngine'

import { useLibraryFeed } from '../state/libraryFeed'

let engine: AudioEngine | null | undefined

/** The Display's single audio engine; null where Web Audio is missing (e.g. tests). */
export function displayAudio(): AudioEngine | null {
  if (engine === undefined) {
    engine =
      typeof AudioContext === 'undefined'
        ? null
        : createAudioEngine({ readBlob: (id) => library.getAssetBlob(id) })
  }
  return engine
}

/** Plays the sounds of an update that just landed (see soundCues). */
export function playUpdateSounds(events: BattleEvent[]) {
  const audio = displayAudio()
  if (!audio) return
  const { sounds, customEffects } = useLibraryFeed.getState()
  for (const id of soundCues(events, sounds, customEffects)) audio.playSfx(id)
}

/**
 * Follows the battle's audio settings: volumes and mute at once, and the current track while
 * the battle is on. In preparation, or with the Master closed, the music fades out.
 */
export function useDisplayMusic(battle: BattleState | null) {
  const audio = battle?.presentation.audio
  const track = battle?.phase === 'active' ? (audio?.musicAssetId ?? null) : null
  const music = audio?.musicVolume
  const sfx = audio?.sfxVolume
  const muted = audio?.muted

  useEffect(() => {
    if (music === undefined || sfx === undefined || muted === undefined) return
    displayAudio()?.setLevels({ music, sfx, muted })
  }, [music, sfx, muted])

  useEffect(() => {
    displayAudio()?.playMusic(track)
  }, [track])
}
