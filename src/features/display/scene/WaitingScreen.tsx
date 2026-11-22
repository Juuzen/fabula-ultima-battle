import { useTranslation } from 'react-i18next'

import { useAsset } from '@/infra/assets/assetResolver'

import { BackgroundMedia } from './BackgroundMedia'

type Props = {
  /** Image or looping video chosen by the GM; null = built-in artwork. */
  backgroundAssetId: string | null
  /** Small hint for the GM while the dashboard is not connected yet. */
  note?: string
}

/** Shown to the players while the GM prepares the encounter. */
export function WaitingScreen({ backgroundAssetId, note }: Props) {
  const { t } = useTranslation()
  const asset = useAsset(backgroundAssetId)

  return (
    <div className="absolute inset-0" data-testid="waiting-screen">
      {asset && asset.kind !== 'audio' ? (
        <BackgroundMedia asset={asset} />
      ) : (
        <div className="absolute inset-0" data-testid="default-waiting-backdrop">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_115%,#3b2a63_0%,#16123a_45%,#06060f_100%)]" />
          {/* Distant stars */}
          <div
            className="absolute inset-0 opacity-90"
            style={{
              backgroundImage:
                'radial-gradient(1.5px 1.5px at 12% 18%, #fff, transparent), radial-gradient(1px 1px at 27% 42%, #cbd5ff, transparent), radial-gradient(1.5px 1.5px at 44% 12%, #fff, transparent), radial-gradient(1px 1px at 63% 30%, #e0e7ff, transparent), radial-gradient(1.5px 1.5px at 78% 16%, #fff, transparent), radial-gradient(1px 1px at 88% 46%, #c7d2fe, transparent), radial-gradient(1px 1px at 8% 60%, #e0e7ff, transparent), radial-gradient(1.5px 1.5px at 35% 70%, #fff, transparent), radial-gradient(1px 1px at 70% 64%, #cbd5ff, transparent), radial-gradient(1px 1px at 93% 78%, #fff, transparent)',
            }}
          />
        </div>
      )}

      {/* Vignette keeps the text readable on any image */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_35%,rgba(0,0,0,.65)_100%)]" />

      <div className="absolute inset-x-0 bottom-[18%] flex flex-col items-center gap-6">
        <div className="h-px w-[520px] bg-linear-to-r from-transparent via-white/60 to-transparent" />
        <p className="font-display waiting-pulse text-6xl tracking-[0.2em] text-white [text-shadow:0_4px_18px_rgba(0,0,0,.8)]">
          {t('display.waiting')}
        </p>
        <div className="h-px w-[520px] bg-linear-to-r from-transparent via-white/60 to-transparent" />
      </div>

      {note && <p className="absolute right-8 bottom-6 text-lg text-slate-400/80">{note}</p>}
    </div>
  )
}
