import { EyeOff, X } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { useBattleStore, useCombatants } from '@/app/store'
import type { Side } from '@/domain'
import { Button } from '@/shared/ui/Button'

import { DeployPopover, DeployTabs } from '../screen/Deploy'
import { FieldCard } from './FieldCard'

function FieldGroup({ side }: { side: Side }) {
  const { t } = useTranslation()
  const combatants = useCombatants(side)
  const preparing = useBattleStore((s) => s.battle.phase === 'preparation')
  const title = t(side === 'ally' ? 'master.party' : 'master.enemies')

  return (
    <section aria-label={title} className="flex flex-col gap-2">
      <h3 className="flex items-center gap-2 px-1 text-xs font-medium tracking-wide text-slate-400 uppercase">
        {title}
        <span className="text-slate-500 tabular-nums">
          <span className="sr-only">{t('master.combatant.count')} </span>
          {combatants.length}
        </span>
        {side === 'enemy' && preparing && combatants.length > 0 && (
          <span className="ml-auto inline-flex items-center gap-1.5 rounded-full bg-amber-400/15 px-2 py-0.5 text-xs font-medium tracking-normal text-amber-300 normal-case">
            <EyeOff className="h-3.5 w-3.5" aria-hidden="true" />
            {t('master.enemiesHidden')}
          </span>
        )}
      </h3>
      {combatants.length === 0 ? (
        <p className="px-1 text-sm text-slate-500">
          {t(side === 'ally' ? 'master.emptyParty' : 'master.emptyEnemies')}
        </p>
      ) : (
        <ul className="flex flex-col gap-1.5">
          {combatants.map((c, i) => (
            <FieldCard key={c.id} combatant={c} index={i} count={combatants.length} />
          ))}
        </ul>
      )}
    </section>
  )
}

/**
 * Left pane of the cockpit: who is on the field, party then enemies, as compact cards.
 * While setting up (from an empty field until the GM closes it or the battle starts) the
 * deploy tabs sit right under the list; afterwards they open from the "Schiera" button.
 */
export function FieldPane() {
  const { t } = useTranslation()
  const empty = useBattleStore((s) => s.battle.combatants.length === 0)
  // Started (in progress, or ended with its banner up): the field is set.
  const active = useBattleStore((s) => s.battle.phase !== 'preparation')
  const [setup, setSetup] = useState(empty && !active)

  // Back to an empty field (battle ended, scene cleared): setting up again.
  if (empty && !active && !setup) setSetup(true)
  if (active && setup && !empty) setSetup(false)

  return (
    <section
      aria-labelledby="field-title"
      className="flex min-h-0 flex-col rounded-xl border border-slate-800 bg-slate-900/80"
    >
      <header className="flex items-center justify-between gap-3 border-b border-slate-800 px-4 py-3">
        <h2 id="field-title" className="font-display text-lg tracking-wide text-slate-100">
          {t('master.field.title')}
        </h2>
        {!setup && <DeployPopover />}
      </header>

      <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto p-3">
        {!empty && (
          <>
            <FieldGroup side="ally" />
            <FieldGroup side="enemy" />
          </>
        )}
        {setup && (
          <section
            aria-label={t('deploy.title')}
            className="flex flex-col gap-3 rounded-lg bg-slate-950/50 p-3 ring-1 ring-slate-800"
          >
            <div className="flex items-center justify-between gap-2">
              <h3 className="font-display text-base tracking-wide text-slate-100">
                {t('deploy.title')}
              </h3>
              {!empty && (
                <Button size="sm" variant="ghost" onClick={() => setSetup(false)}>
                  <X className="h-4 w-4" aria-hidden="true" />
                  {t('deploy.closeSetup')}
                </Button>
              )}
            </div>
            {empty && <p className="text-sm text-slate-400">{t('deploy.emptyHint')}</p>}
            <DeployTabs />
          </section>
        )}
      </div>
    </section>
  )
}
