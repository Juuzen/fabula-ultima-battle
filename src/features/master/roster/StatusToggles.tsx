import { useTranslation } from 'react-i18next'

import { useBattleActions } from '@/app/store'
import { STATUS_IDS, type Combatant } from '@/domain'
import { StatusIcon } from '@/features/display'

/** One toggle per status, drawn with the same icons the players see. */
export function StatusToggles({ combatant }: { combatant: Combatant }) {
  const { t } = useTranslation()
  const { dispatch } = useBattleActions()

  return (
    <div role="group" aria-label={t('master.combatant.statuses')} className="flex gap-1.5">
      {STATUS_IDS.map((status) => {
        const active = combatant.statuses.includes(status)
        return (
          <button
            key={status}
            type="button"
            aria-pressed={active}
            title={t(`status.${status}`)}
            onClick={() =>
              dispatch({ type: 'SET_STATUS', id: combatant.id, status, active: !active })
            }
            className={`rounded-full p-0.5 transition focus-visible:outline-2 focus-visible:outline-indigo-400 ${
              active ? '' : 'opacity-30 grayscale hover:opacity-70'
            }`}
          >
            <StatusIcon status={status} size={30} />
          </button>
        )
      })}
    </div>
  )
}
