import type { ResolvedAsset } from '@/infra/assets/assetResolver'

/** A full-stage background: a still image, or a silent looping video. */
export function BackgroundMedia({ asset }: { asset: ResolvedAsset }) {
  const className = 'absolute inset-0 h-full w-full object-cover'
  if (asset.kind === 'video') {
    return (
      <video
        src={asset.url}
        className={className}
        autoPlay
        loop
        muted
        playsInline
        aria-hidden="true"
        data-testid="background-video"
      />
    )
  }
  return <img src={asset.url} alt="" className={className} />
}
