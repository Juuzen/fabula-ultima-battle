import type { ReactNode } from 'react'

import { AssetResolverContext, type AssetResolver } from './assetResolver'

export function AssetResolverProvider({
  resolver,
  children,
}: {
  resolver: AssetResolver
  children: ReactNode
}) {
  return <AssetResolverContext value={resolver}>{children}</AssetResolverContext>
}
