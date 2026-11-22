import { createContext, useContext, useEffect, useSyncExternalStore } from 'react'

import { kindOfMime, type AssetKind } from '@/domain'

/** A file ready to render: a URL the browser can load, and what it is (image, video, audio). */
export type ResolvedAsset = { url: string; kind: AssetKind }

/**
 * Turns asset ids (stored in the battle state and in sheets) into URLs. Lookups may be
 * asynchronous (IndexedDB), so a source is a small external store: `peek` answers from what
 * is loaded, `load` asks for an id, `subscribe` tells when something arrived.
 */
export type AssetSource = {
  /** undefined = not loaded yet; null = no such file. */
  peek: (id: string) => ResolvedAsset | null | undefined
  load: (id: string) => void
  subscribe: (listener: () => void) => () => void
}

const noop = () => {}

/** Resolves nothing: the Display falls back to its built-in placeholders. */
export const nullSource: AssetSource = { peek: () => null, load: noop, subscribe: () => noop }

/** A synchronous source, for tests and previews. A plain string counts as an image. */
export function staticAssetSource(
  resolve: (id: string) => string | ResolvedAsset | null,
): AssetSource {
  // Same object for the same id: React compares snapshots by identity.
  const cache = new Map<string, ResolvedAsset | null>()
  return {
    peek: (id) => {
      if (!cache.has(id)) {
        const value = resolve(id)
        cache.set(id, typeof value === 'string' ? { url: value, kind: 'image' } : value)
      }
      return cache.get(id)
    },
    load: noop,
    subscribe: () => noop,
  }
}

export type BlobAssetSource = AssetSource & {
  /** Drops a file from the cache (e.g. after deleting it) and frees its URL. */
  forget: (id: string) => void
}

/**
 * Loads files as Blobs and keeps one object URL per file for the life of the window: files
 * never change once stored, so the URL stays valid and images and videos are not reloaded.
 */
export function createBlobAssetSource(
  read: (id: string) => Promise<Blob | undefined>,
  urls: Pick<typeof URL, 'createObjectURL' | 'revokeObjectURL'> = URL,
): BlobAssetSource {
  const cache = new Map<string, ResolvedAsset | null>()
  const pending = new Set<string>()
  const listeners = new Set<() => void>()
  const notify = () => listeners.forEach((l) => l())

  return {
    peek: (id) => cache.get(id),
    load(id) {
      if (cache.has(id) || pending.has(id)) return
      pending.add(id)
      read(id)
        .then((blob) => {
          const kind = blob ? kindOfMime(blob.type) : null
          cache.set(id, blob && kind ? { url: urls.createObjectURL(blob), kind } : null)
        })
        .catch((error: unknown) => {
          console.error('Could not load asset', id, error)
          cache.set(id, null)
        })
        .finally(() => {
          pending.delete(id)
          notify()
        })
    },
    subscribe(listener) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    forget(id) {
      const entry = cache.get(id)
      if (entry) urls.revokeObjectURL(entry.url)
      cache.delete(id)
      notify()
    },
  }
}

export const AssetSourceContext = createContext<AssetSource>(nullSource)

/** The file behind an id (null id = none); null while loading or when it does not exist. */
export function useAsset(assetId: string | null): ResolvedAsset | null {
  const source = useContext(AssetSourceContext)
  const resolved = useSyncExternalStore(source.subscribe, () =>
    assetId === null ? null : source.peek(assetId),
  )
  useEffect(() => {
    if (assetId !== null) source.load(assetId)
  }, [source, assetId])
  return resolved ?? null
}

export function useAssetUrl(assetId: string | null): string | null {
  return useAsset(assetId)?.url ?? null
}
