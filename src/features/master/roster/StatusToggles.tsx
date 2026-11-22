import { Check } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { useBattleActions } from '@/app/store'
import { STATUS_IDS, type Combatant } from '@/domain'
import { StatusIcon } from '@/features/display'

/**
 * One named toggle per status, drawn with the same icons the players see.
 * Active ones are lit and checked; inactive ones stay readable, just quieter.
 */
export function StatusToggles({ combatant }: { combatant: Combatant }) {
  const { t } = useTranslation()
  const { dispatch } = useBattleActions()

  return (
    <div
      role="group"
      aria-label={t('master.combatant.statuses', { name: combatant.name })}
      className="grid w-64 grid-cols-2 gap-1"
    >
      {STATUS_IDS.map((status) => {
        const active = combatant.statuses.includes(status)
        return (
          <button
            key={status}
            type="button"
            aria-pressed={active}
            onClick={() =>
              dispatch({ type: 'SET_STATUS', id: combatant.id, status, active: !active })
            }
            className={`flex h-10 items-center gap-2 rounded-md px-2 text-left text-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-indigo-400 ${
              active
                ? 'bg-indigo-500/20 font-semibold text-white ring-1 ring-indigo-400/60'
                : 'text-slate-300 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <span aria-hidden="true" className={active ? '' : 'opacity-60 grayscale-[60%]'}>
              <StatusIcon status={status} size={24} />
            </span>
            <span className="min-w-0 flex-1 truncate">{t(`status.${status}`)}</span>
            {active && <Check className="h-4 w-4 shrink-0 text-indigo-200" aria-hidden="true" />}
          </button>
        )
      })}
    </div>
  )
}
