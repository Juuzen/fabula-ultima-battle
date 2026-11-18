import { useTranslation } from 'react-i18next'

import { isInCrisis, isKnockedOut, type Combatant } from '@/domain'
import { useAssetUrl } from '@/infra/assets/assetResolver'

import { PlaceholderPortrait } from './PlaceholderPortrait'
import { ResourceGauge } from './ResourceGauge'
import { StateTag } from './StateTag'
import { StatusIcons } from './StatusIcons'

/**
 * One party member in the bottom panel: portrait as background, name plate on top,
 * statuses in the middle, HP/MP gauges at the bottom (inspired by modern 2D JRPGs).
 */
export function PartySlot({ combatant, width }: { combatant: Combatant; width: number }) {
  const { t } = useTranslation()
  const portraitUrl = useAssetUrl(combatant.portraitAssetId)
  const spriteUrl = useAssetUrl(combatant.spriteAssetId)
  const imageUrl = portraitUrl ?? spriteUrl
  const ko = isKnockedOut(combatant)
  const crisis = isInCrisis(combatant)

  const nameColour = ko ? 'text-red-400' : crisis ? 'text-amber-300' : 'text-white'
  const frame = ko ? 'ring-red-500/70' : crisis ? 'ring-amber-400 slot-crisis' : 'ring-white/35'

  return (
    <article
      data-testid={`party-slot-${combatant.id}`}
      data-state={ko ? 'ko' : crisis ? 'crisis' : 'ok'}
      aria-label={combatant.name}
      className={`relative h-full shrink-0 overflow-hidden rounded-lg bg-slate-900 ring-2 ${frame}`}
      style={{ width }}
    >
      {/* Portrait */}
      <div className={`absolute inset-0 ${ko ? 'brightness-50 grayscale' : ''}`}>
        {imageUrl ? (
          <img
            src={imageUrl}
            alt=""
            draggable={false}
            className="h-full w-full object-cover object-top"
          />
        ) : (
          <PlaceholderPortrait name={combatant.name} side={combatant.side} />
        )}
      </div>

      {/* Name plate */}
      <header className="absolute inset-x-0 top-0 flex items-center justify-between gap-2 bg-linear-to-b from-slate-950/90 to-slate-950/40 px-3 py-1.5">
        <span className={`font-display truncate text-2xl font-bold ${nameColour}`}>
          {combatant.name}
        </span>
        <StateTag combatant={combatant} />
      </header>

      {/* Statuses */}
      <div className="absolute inset-x-3 top-12">
        <StatusIcons statuses={combatant.statuses} size={30} />
      </div>

      {/* Gauges */}
      <footer className="absolute inset-x-0 bottom-0 flex flex-col gap-1 bg-linear-to-t from-slate-950 via-slate-950/90 to-transparent px-3 pt-6 pb-2.5">
        <ResourceGauge
          kind="hp"
          label={t('display.hp')}
          value={combatant.hp}
          max={combatant.maxHp}
        />
        {combatant.maxMp > 0 && (
          <ResourceGauge
            kind="mp"
            label={t('display.mp')}
            value={combatant.mp}
            max={combatant.maxMp}
          />
        )}
      </footer>
    </article>
  )
}
