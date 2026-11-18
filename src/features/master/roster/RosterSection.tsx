import { useTranslation } from 'react-i18next'

import { useCombatants } from '@/app/store'
import type { Side } from '@/domain'
import { Panel } from '@/shared/ui/Panel'

import { AddCombatantForm } from './AddCombatantForm'
import { CombatantCard } from './CombatantCard'

/** Party or enemy list, in display order, with the add form at the bottom. */
export function RosterSection({ side }: { side: Side }) {
  const { t } = useTranslation()
  const combatants = useCombatants(side)
  const title = t(side === 'ally' ? 'master.party' : 'master.enemies')

  return (
    <Panel
      title={title}
      actions={<span className="text-sm text-slate-400 tabular-nums">{combatants.length}</span>}
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
