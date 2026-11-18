import { useTranslation } from 'react-i18next'

import { isInCrisis, isKnockedOut, type Combatant } from '@/domain'

import { HpBar } from './HpBar'
import { StateTag } from './PartyWindow'

/**
 * Enemy list. Players see names, a gauge and the Crisis state, but not the exact numbers:
 * in Fabula Ultima the GM decides how much the party knows about its foes.
 */
export function EnemyWindow({ enemies }: { enemies: Combatant[] }) {
  const { t } = useTranslation()
  const twoColumns = enemies.length > 4
  // Beyond 8 foes use five rows per column so the list still fits in three columns.
  const rows = enemies.length > 8 ? 'grid-rows-5' : 'grid-rows-4'

  return (
    <section aria-label={t('display.enemies')} className="jrpg-window flex flex-col justify-center">
      <ul
        className={`grid gap-x-8 ${twoColumns ? `auto-cols-fr grid-flow-col gap-y-1 ${rows}` : 'gap-y-2'}`}
      >
        {enemies.map((c) => {
          const ko = isKnockedOut(c)
          return (
            <li key={c.id} data-testid={`enemy-row-${c.id}`} className="flex flex-col gap-1">
              <span className="flex items-center gap-2">
                <span
                  className={`font-display truncate font-semibold ${twoColumns ? 'text-xl' : 'text-2xl'} ${
                    ko ? 'text-slate-500 line-through' : 'text-white'
                  }`}
                >
                  {c.name}
                </span>
                {isInCrisis(c) && <StateTag tone="crisis">{t('display.crisis')}</StateTag>}
              </span>
              {!ko && <HpBar hp={c.hp} maxHp={c.maxHp} className="h-2" />}
            </li>
          )
        })}
      </ul>
    </section>
  )
}
