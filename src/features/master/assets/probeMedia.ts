import { kindOfMime } from '@/domain'

export type MediaInfo = { width: number | null; height: number | null; durationMs: number | null }

const UNKNOWN: MediaInfo = { width: null, height: null, durationMs: null }

/** Gives up on files the browser cannot decode, rather than waiting forever. */
const TIMEOUT_MS = 8000

/**
 * Reads what the library shows about a file: pixel size of images and videos, length of
 * videos and audio. Anything the browser can't read stays unknown (the file is still kept).
 */
export function probeMedia(file: Blob): Promise<MediaInfo> {
  const kind = kindOfMime(file.type)
  if (!kind || typeof document === 'undefined') return Promise.resolve(UNKNOWN)
  const url = URL.createObjectURL(file)

  return new Promise<MediaInfo>((resolve) => {
    const done = (info: MediaInfo) => {
      window.clearTimeout(timer)
      URL.revokeObjectURL(url)
      resolve(info)
    }
    const timer = window.setTimeout(() => done(UNKNOWN), TIMEOUT_MS)

    if (kind === 'image') {
      const img = new Image()
      img.onload = () =>
        done({ width: img.naturalWidth, height: img.naturalHeight, durationMs: null })
      img.onerror = () => done(UNKNOWN)
      img.src = url
      return
    }

    const media = document.createElement(kind === 'video' ? 'video' : 'audio')
    media.preload = 'metadata'
    media.onloadedmetadata = () => {
      const duration = Number.isFinite(media.duration) ? Math.round(media.duration * 1000) : null
      const video = media instanceof HTMLVideoElement ? media : null
      done({
        width: video?.videoWidth || null,
        height: video?.videoHeight || null,
        durationMs: duration,
      })
    }
    media.onerror = () => done(UNKNOWN)
    media.src = url
  })
}
