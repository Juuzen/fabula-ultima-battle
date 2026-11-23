/** Seconds a track takes to fade into the next one (or into silence). */
export const CROSSFADE_SECONDS = 1.5

export type AudioLevels = {
  /** 0–100, as in the battle's audio settings. */
  music: number
  sfx: number
  muted: boolean
}

export type AudioEngine = {
  /** Call from a click: browsers only let a page make sound after a user gesture. */
  unlock: () => void
  setLevels: (levels: AudioLevels) => void
  /**
   * Crossfades to a track, looping unless told otherwise (a fanfare plays once); null fades
   * out. The same track keeps playing.
   */
  playMusic: (assetId: string | null, options?: { loop?: boolean }) => void
  /** Plays a sound effect once (ignored until unlocked, so nothing piles up). */
  playSfx: (assetId: string) => void
  dispose: () => void
}

type Track = { assetId: string; element: HTMLAudioElement; gain: GainNode; url: string }

/** Volume sliders feel linear when the gain follows the square of the value. */
const toGain = (value: number) => (Math.min(Math.max(value, 0), 100) / 100) ** 2

/**
 * Plays the Display's music and sound effects through Web Audio: one gain for the music, one
 * for the effects, one master gain for mute. Music streams from an <audio> element (long
 * files, looping); effects are decoded once and replayed from memory.
 */
export function createAudioEngine({
  readBlob,
  context = new AudioContext(),
}: {
  readBlob: (assetId: string) => Promise<Blob | undefined>
  context?: AudioContext
}): AudioEngine {
  const master = context.createGain()
  const music = context.createGain()
  const sfx = context.createGain()
  music.connect(master)
  sfx.connect(master)
  master.connect(context.destination)

  const buffers = new Map<string, Promise<AudioBuffer | null>>()
  let current: Track | null = null
  let wanted: string | null = null
  let disposed = false

  const fade = (gain: GainNode, to: number) => {
    const now = context.currentTime
    gain.gain.cancelScheduledValues(now)
    gain.gain.setValueAtTime(gain.gain.value, now)
    gain.gain.linearRampToValueAtTime(to, now + CROSSFADE_SECONDS)
  }

  const stopTrack = (track: Track) => {
    fade(track.gain, 0)
    window.setTimeout(
      () => {
        track.element.pause()
        track.element.removeAttribute('src')
        track.gain.disconnect()
        URL.revokeObjectURL(track.url)
      },
      CROSSFADE_SECONDS * 1000 + 100,
    )
  }

  const startTrack = async (assetId: string, loop: boolean) => {
    const blob = await readBlob(assetId).catch(() => undefined)
    // Changed again (or closed) while the file was loading: that request is stale.
    if (disposed || wanted !== assetId || !blob) return
    const url = URL.createObjectURL(blob)
    const element = new Audio(url)
    element.loop = loop
    const gain = context.createGain()
    gain.gain.value = 0
    context.createMediaElementSource(element).connect(gain)
    gain.connect(music)
    if (current) stopTrack(current)
    current = { assetId, element, gain, url }
    fade(gain, 1)
    element.play().catch(() => {
      // Not unlocked yet: unlock() starts it.
    })
  }

  const decode = (assetId: string) => {
    let buffer = buffers.get(assetId)
    if (!buffer) {
      buffer = readBlob(assetId)
        .then((blob) => (blob ? blob.arrayBuffer() : null))
        .then((data) => (data ? context.decodeAudioData(data) : null))
        .catch((error: unknown) => {
          console.error('Could not decode sound', assetId, error)
          return null
        })
      buffers.set(assetId, buffer)
    }
    return buffer
  }

  return {
    unlock() {
      void context.resume().then(() => current?.element.play().catch(() => {}))
    },
    setLevels(levels) {
      const now = context.currentTime
      // Short ramps: no clicks when a slider moves.
      music.gain.setTargetAtTime(toGain(levels.music), now, 0.05)
      sfx.gain.setTargetAtTime(toGain(levels.sfx), now, 0.05)
      master.gain.setTargetAtTime(levels.muted ? 0 : 1, now, 0.05)
    },
    playMusic(assetId, { loop = true } = {}) {
      if (assetId === wanted) {
        if (current) current.element.loop = loop
        return
      }
      wanted = assetId
      if (assetId === null) {
        if (current) stopTrack(current)
        current = null
        return
      }
      void startTrack(assetId, loop)
    },
    playSfx(assetId) {
      if (context.state !== 'running') return
      void decode(assetId).then((buffer) => {
        if (!buffer || disposed) return
        const source = context.createBufferSource()
        source.buffer = buffer
        source.connect(sfx)
        source.start()
      })
    },
    dispose() {
      disposed = true
      current?.element.pause()
      void context.close()
    },
  }
}
