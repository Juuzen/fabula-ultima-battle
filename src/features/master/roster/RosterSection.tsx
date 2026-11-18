import { useTranslation } from 'react-i18next'

import { EyeOff } from 'lucide-react'

import { useBattleStore, useCombatants } from '@/app/store'
import type { Side } from '@/domain'
import { Panel } from '@/shared/ui/Panel'

import { AddCombatantForm } from './AddCombatantForm'
import { CombatantCard } from './CombatantCard'

/** Party or enemy list, in display order, with the add form at the bottom. */
export function RosterSection({ side }: { side: Side }) {
  const { t } = useTranslation()
  const combatants = useCombatants(side)
  const preparing = useBattleStore((s) => s.battle.phase === 'preparation')
  const title = t(side === 'ally' ? 'master.party' : 'master.enemies')
  const hidden = side === 'enemy' && preparing

  return (
    <Panel
      title={title}
      actions={
        <div className="flex items-center gap-3">
          {hidden && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-400/15 px-2.5 py-0.5 text-xs font-medium text-amber-300">
              <EyeOff className="h-3.5 w-3.5" aria-hidden="true" />
              {t('master.enemiesHidden')}
            </span>
          )}
          <span className="text-sm text-slate-400 tabular-nums">{combatants.length}</span>
        </div>
      }
    >
      {combatants.length === 0 ? (
        <p className="mb-4 text-sm text-slate-500">
          {t(side === 'ally' ? 'master.emptyParty' : 'master.emptyEnemies')}
        </p>
      ) : (
        <ul className="mb-4 flex flex-col gap-2">
          {combatants.map((c, i) => (
            <CombatantCard key={c.id} combatant={c} index={i} count={combatants.length} />
          ))}
        </ul>
      )}
      <AddCombatantForm side={side} />
    </Panel>
  )
}
