import { useTranslation } from 'react-i18next'

import { areStatsRevealed, isKnockedOut, type Combatant, type Presentation } from '@/domain'

import { ResourceGauge } from './ResourceGauge'
import { StateTag } from './StateTag'
import { StatusBadges } from './StatusBadges'

type Props = { enemies: Combatant[]; presentation: Presentation; visible: boolean }

/**
 * Pop-up enemy info, as a centred band at the top of the screen (mirroring the party panel).
 * Always shows name, Crisis/KO and statuses; exact HP/MP only for foes the GM revealed.
 */
export function EnemyInfoWindow({ enemies, presentation, visible }: Props) {
  const { t } = useTranslation()

  return (
    <div
      className={`absolute inset-x-0 top-5 flex justify-center transition-all duration-300 ease-out ${
        visible ? 'translate-y-0 opacity-100' : 'pointer-events-none -translate-y-8 opacity-0'
      }`}
      style={{ zIndex: 1500 }}
    >
      <section
        aria-label={t('display.enemies')}
        aria-hidden={!visible}
        data-visible={visible}
        className="jrpg-window flex h-auto! max-w-[1840px] flex-wrap items-start justify-center gap-3 px-3! py-3!"
      >
        {enemies.map((e) => {
          const ko = isKnockedOut(e)
          const revealed = areStatsRevealed(presentation, e)
          return (
            <article
              key={e.id}
              data-testid={`enemy-info-${e.id}`}
              className={`flex w-[290px] flex-col gap-1.5 rounded-lg bg-slate-950/45 px-3 py-2 ring-1 ${
                ko ? 'ring-red-500/50' : 'ring-white/20'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span
                  className={`font-display truncate text-xl font-semibold ${
                    ko ? 'text-slate-500 line-through' : 'text-white'
                  }`}
                >
                  {e.name}
                </span>
                <StateTag combatant={e} />
              </div>
              <StatusBadges statuses={e.statuses} size="sm" />
              {revealed && (
                <div className="flex flex-col gap-1">
                  <ResourceGauge
                    kind="hp"
                    label={t('display.hp')}
                    value={e.hp}
                    max={e.maxHp}
                    size="sm"
                  />
                  {e.maxMp > 0 && (
                    <ResourceGauge
                      kind="mp"
                      label={t('display.mp')}
                      value={e.mp}
                      max={e.maxMp}
                      size="sm"
                    />
                  )}
                </div>
              )}
            </article>
          )
        })}
      </section>
    </div>
  )
}
