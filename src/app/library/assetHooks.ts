import {
  createDefaultSoundSettings,
  type AssetId,
  type AssetMeta,
  type AssetRole,
  type CustomEffect,
  type SoundSettings,
} from '@/domain'

import { library } from './library'
import { useLiveQuery } from './liveQuery'

// Library reads shared by the Master and the Display. No battle store here: the Display
// imports these and must not touch the Master's persisted state.

/** Files on a shelf (or all of them), newest first; undefined while loading. */
export function useAssets(role?: AssetRole): AssetMeta[] | undefined {
  return useLiveQuery(() => library.listAssets(role), `assets:${role ?? '*'}`)
}

/** One file's metadata (null id = none); undefined while loading or when it is gone. */
export function useAssetMeta(id: AssetId | null): AssetMeta | undefined {
  return useLiveQuery(async () => (id ? library.getAsset(id) : undefined), `asset:${id ?? ''}`)
}

export function useCustomEffects(): CustomEffect[] | undefined {
  return useLiveQuery(() => library.listEffects(), 'effects')
}

const DEFAULT_SOUNDS = createDefaultSoundSettings()

/** Sound settings; the defaults (no sounds) while loading. */
export function useSoundSettings(): SoundSettings {
  return useLiveQuery(() => library.getSoundSettings(), 'sounds') ?? DEFAULT_SOUNDS
}

export type StorageEstimate = { used: number; quota: number; files: number }

/** Browser storage used by the app, measured again whenever files are added or deleted. */
export function useStorageEstimate(): StorageEstimate | undefined {
  return useLiveQuery(async () => {
    const files = await library.db.assets.count()
    const estimate = await navigator.storage?.estimate?.()
    if (!estimate?.quota || estimate.usage === undefined) return undefined
    return { used: estimate.usage, quota: estimate.quota, files }
  }, 'storage')
}
