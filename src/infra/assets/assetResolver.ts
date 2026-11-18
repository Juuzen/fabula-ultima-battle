import { createContext, useContext } from 'react'

/**
 * Turns an asset id (stored in the battle state) into a URL the browser can render.
 * Phase 7 will provide an IndexedDB-backed implementation; until then nothing resolves
 * and the Display falls back to its built-in placeholders.
 */
export type AssetResolver = (assetId: string) => string | null

export const nullResolver: AssetResolver = () => null

export const AssetResolverContext = createContext<AssetResolver>(nullResolver)

export function useAssetUrl(assetId: string | null): string | null {
  const resolve = useContext(AssetResolverContext)
  return assetId === null ? null : resolve(assetId)
}
