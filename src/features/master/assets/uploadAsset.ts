import { AssetRejectedError, library, type AssetRejection } from '@/app/library/library'
import type { AssetMeta, AssetRole } from '@/domain'

import { probeMedia } from './probeMedia'

export type UploadProblem = AssetRejection | 'failed'

export type UploadResult =
  { asset: AssetMeta; problem: null } | { asset: null; problem: UploadProblem }

let persistenceAsked = false

/** Asks once for durable storage, so the browser does not evict the GM's files. */
function askForPersistence() {
  if (persistenceAsked) return
  persistenceAsked = true
  void navigator.storage?.persist?.().catch(() => false)
}

/** File name without its extension, as a first display name. */
export const baseName = (fileName: string) => fileName.replace(/\.[^.]+$/, '') || fileName

/** Stores a file on a shelf of the library, with what the browser could read of it. */
export async function uploadAsset(file: File, role: AssetRole): Promise<UploadResult> {
  try {
    const info = await probeMedia(file)
    const asset = await library.addAsset({ name: baseName(file.name), blob: file, role, ...info })
    askForPersistence()
    return { asset, problem: null }
  } catch (error) {
    if (error instanceof AssetRejectedError) return { asset: null, problem: error.reason }
    console.error('Upload failed', error)
    return { asset: null, problem: 'failed' }
  }
}

/** What the file input accepts on each shelf (the library checks again on upload). */
export const ACCEPT: Record<AssetRole, string> = {
  art: 'image/*',
  background: 'image/*,video/*',
  effect: 'video/*',
  music: 'audio/*',
  sfx: 'audio/*',
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(0)} KB`
  if (bytes < 1024 ** 3) return `${(bytes / 1024 ** 2).toFixed(1)} MB`
  return `${(bytes / 1024 ** 3).toFixed(2)} GB`
}
