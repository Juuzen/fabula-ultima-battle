import { useAsset } from '@/infra/assets/assetResolver'

import { BackgroundMedia } from './BackgroundMedia'

/**
 * Full-stage background: the chosen image or looping video, or a neutral dusk battlefield
 * when none is set (or the file is gone).
 */
export function Backdrop({ assetId }: { assetId: string | null }) {
  const asset = useAsset(assetId)

  if (asset && asset.kind !== 'audio') return <BackgroundMedia asset={asset} />

  return (
    <div className="absolute inset-0" data-testid="default-backdrop">
      {/* Sky */}
      <div className="absolute inset-0 bg-linear-to-b from-[#1a1440] via-[#3b2a63] to-[#c27a5a]" />
      {/* Horizon glow */}
      <div className="absolute inset-x-0 top-[34%] h-40 -translate-y-1/2 bg-[radial-gradient(ellipse_at_center,rgba(255,200,150,.45),transparent_70%)]" />
      {/* Ground */}
      <div className="absolute inset-x-0 top-[34%] bottom-0 bg-linear-to-b from-[#3d3a2c] via-[#26261d] to-[#121210]" />
      {/* Perspective grid, for a sense of depth */}
      <div
        className="absolute inset-x-0 top-[34%] bottom-0 opacity-20"
        style={{
          backgroundImage:
            'repeating-linear-gradient(90deg, rgba(255,255,255,.35) 0 1px, transparent 1px 120px), repeating-linear-gradient(0deg, rgba(255,255,255,.25) 0 1px, transparent 1px 60px)',
          transform: 'perspective(600px) rotateX(55deg)',
          transformOrigin: 'top',
        }}
      />
    </div>
  )
}
