import { useMemo, type ReactNode } from 'react'

import { AssetSourceContext, staticAssetSource, type ResolvedAsset } from './assetResolver'

/** Test and preview helper: resolves ids synchronously (a plain string counts as an image). */
export function AssetResolverProvider({
  resolver,
  children,
}: {
  resolver: (id: string) => string | ResolvedAsset | null
  children: ReactNode
}) {
  const source = useMemo(() => staticAssetSource(resolver), [resolver])
  return <AssetSourceContext value={source}>{children}</AssetSourceContext>
}
