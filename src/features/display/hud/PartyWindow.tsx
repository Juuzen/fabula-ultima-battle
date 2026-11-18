import { useTranslation } from 'react-i18next'

import { isInCrisis, isKnockedOut, type Combatant } from '@/domain'

import { HpBar } from './HpBar'
import { StatusBadges } from './StatusBadges'

/** Classic JRPG party status window: one row per ally with HP numbers and gauge. */
export function PartyWindow({ allies }: { allies: Combatant[] }) {
  const { t } = useTranslation()
  // Up to 4 rows fit comfortably; bigger parties switch to a denser layout.
  const compact = allies.length > 4
  const nameSize = compact ? 'text-2xl' : 'text-[1.75rem]'
  const hpSize = compact ? 'text-2xl' : 'text-[1.75rem]'

  return (
    <section
      aria-label={t('display.party')}
      className={`jrpg-window flex flex-col justify-center ${compact ? 'py-3!' : ''}`}
    >
      <ul className={`flex flex-col ${compact ? 'gap-0' : 'gap-2'}`}>
        {allies.map((c) => {
          const ko = isKnockedOut(c)
          const crisis = isInCrisis(c)
          return (
            <li
              key={c.id}
              data-testid={`party-row-${c.id}`}
              className="grid grid-cols-[minmax(0,15rem)_1fr_9rem_14rem] items-center gap-5"
            >
              <span
                className={`font-display truncate font-semibold ${nameSize} ${ko ? 'text-red-400' : 'text-white'}`}
              >
                {c.name}
              </span>
              <span className="flex items-center gap-3">
                {ko && <StateTag tone="ko">{t('display.ko')}</StateTag>}
                {crisis && <StateTag tone="crisis">{t('display.crisis')}</StateTag>}
                <StatusBadges statuses={c.statuses} size="sm" />
              </span>
              <span
                className={`text-right font-semibold tabular-nums ${hpSize} ${
                  ko ? 'text-red-400' : crisis ? 'text-amber-300' : 'text-white'
                }`}
              >
                {c.hp}
                <span className={compact ? 'text-base text-slate-300' : 'text-xl text-slate-300'}>
                  {' '}
                  / {c.maxHp}
                </span>
              </span>
              <HpBar hp={c.hp} maxHp={c.maxHp} className="h-3.5" />
            </li>
          )
        })}
      </ul>
    </section>
  )
}

export function StateTag({ tone, children }: { tone: 'ko' | 'crisis'; children: string }) {
  return (
    <span
      className={`rounded-sm px-2 py-0.5 text-sm font-bold tracking-widest uppercase ${
        tone === 'ko' ? 'bg-red-600 text-white' : 'animate-pulse bg-amber-400 text-amber-950'
      }`}
    >
      {children}
    </span>
  )
}
