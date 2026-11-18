import { ChevronDown, ChevronUp, Pencil, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { useBattleActions, useBattleStore } from '@/app/store'
import { isInCrisis, isKnockedOut, type Combatant } from '@/domain'
import { StateTag } from '@/features/display'
import { Button } from '@/shared/ui/Button'
import { Toggle } from '@/shared/ui/fields'

import { EditCombatantForm } from './EditCombatantForm'
import { QuickActions } from './QuickActions'
import { StatusToggles } from './StatusToggles'

function Readout({
  label,
  value,
  max,
  tone,
}: {
  label: string
  value: number
  max: number
  tone: string
}) {
  const ratio = max > 0 ? value / max : 0
  return (
    <div className="flex w-36 flex-col gap-1">
      <div className="flex items-baseline justify-between text-sm">
        <span className="font-semibold text-slate-400">{label}</span>
        <span className="font-semibold text-slate-100 tabular-nums">
          {value}
          <span className="text-slate-500"> / {max}</span>
        </span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-slate-800">
        <div className={`h-full rounded-full ${tone}`} style={{ width: `${ratio * 100}%` }} />
      </div>
    </div>
  )
}

type Props = { combatant: Combatant; index: number; count: number }

/** Control card for one combatant: readouts, quick actions, statuses, visibility, editing. */
export function CombatantCard({ combatant: c, index, count }: Props) {
  const { t } = useTranslation()
  const { dispatch } = useBattleActions()
  const revealAll = useBattleStore((s) => s.battle.presentation.revealAllEnemyStats)
  const [editing, setEditing] = useState(false)

  const ko = isKnockedOut(c)
  const hpTone = ko ? 'bg-red-600' : isInCrisis(c) ? 'bg-amber-400' : 'bg-emerald-500'

  return (
    <li
      data-testid={`combatant-${c.id}`}
      aria-label={c.name}
      className={`rounded-lg border bg-slate-950/60 p-3 ${ko ? 'border-red-900/70' : 'border-slate-800'}`}
    >
      <div className="flex items-center gap-3">
        <div className="flex flex-col">
          <button
            type="button"
            aria-label={t('master.combatant.moveUp')}
            disabled={index === 0}
            onClick={() => dispatch({ type: 'MOVE_COMBATANT', id: c.id, toIndex: index - 1 })}
            className="rounded text-slate-400 hover:text-white disabled:opacity-20"
          >
            <ChevronUp className="h-4 w-4" />
          </button>
          <button
            type="button"
            aria-label={t('master.combatant.moveDown')}
            disabled={index === count - 1}
            onClick={() => dispatch({ type: 'MOVE_COMBATANT', id: c.id, toIndex: index + 1 })}
            className="rounded text-slate-400 hover:text-white disabled:opacity-20"
          >
            <ChevronDown className="h-4 w-4" />
          </button>
        </div>

        <div className="flex min-w-0 flex-1 items-center gap-2">
          <h3
            className={`font-display truncate text-lg font-semibold ${ko ? 'text-red-400 line-through' : 'text-white'}`}
          >
            {c.name}
          </h3>
          <StateTag combatant={c} size="sm" />
        </div>

        <Readout label={t('display.hp')} value={c.hp} max={c.maxHp} tone={hpTone} />
        {c.maxMp > 0 ? (
          <Readout label={t('display.mp')} value={c.mp} max={c.maxMp} tone="bg-sky-500" />
        ) : (
          // Keep columns aligned across cards when a combatant has no MP.
          <div className="w-36" aria-hidden="true" />
        )}

        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="sm"
            aria-label={t('master.combatant.edit')}
            aria-expanded={editing}
            onClick={() => setEditing((v) => !v)}
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            aria-label={t('master.combatant.remove')}
            onClick={() => dispatch({ type: 'REMOVE_COMBATANT', id: c.id })}
            className="hover:text-rose-400"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="mt-3 border-t border-slate-800 pt-3">
        {editing ? (
          <EditCombatantForm combatant={c} onDone={() => setEditing(false)} />
        ) : (
          <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
            <div className="min-w-0 flex-1">
              <QuickActions combatant={c} />
            </div>
            <StatusToggles combatant={c} />
            {c.side === 'enemy' && (
              <Toggle
                label={t('master.combatant.reveal')}
                description={revealAll ? t('master.combatant.revealedByAll') : undefined}
                checked={revealAll || c.revealStats}
                disabled={revealAll}
                onChange={(reveal) => dispatch({ type: 'SET_REVEAL_STATS', id: c.id, reveal })}
              />
            )}
          </div>
        )}
      </div>
    </li>
  )
}
