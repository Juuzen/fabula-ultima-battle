import { Film, Image, Music } from 'lucide-react'

import type { AssetKind } from '@/domain'
import { useAsset } from '@/infra/assets/assetResolver'

const ICONS = { image: Image, video: Film, audio: Music } as const

/**
 * A small preview of a file: the image, a still of the video, or a note for audio. Covers its
 * box; `fallback` is the icon shown while nothing is chosen (or loaded).
 */
export function AssetThumb({
  assetId,
  fallback = 'image',
  fit = 'contain',
}: {
  assetId: string | null
  fallback?: AssetKind
  fit?: 'contain' | 'cover'
}) {
  const asset = useAsset(assetId)
  const media = `h-full w-full ${fit === 'cover' ? 'object-cover' : 'object-contain'}`
  if (asset?.kind === 'image') return <img src={asset.url} alt="" className={media} />
  if (asset?.kind === 'video') {
    // A still from just after the start (the very first frame is often black).
    return (
      <video
        src={`${asset.url}#t=0.1`}
        muted
        preload="metadata"
        className={media}
        aria-hidden="true"
      />
    )
  }
  const Icon = ICONS[asset?.kind ?? fallback]
  return <Icon className="h-7 w-7 text-slate-400" aria-hidden="true" />
}
