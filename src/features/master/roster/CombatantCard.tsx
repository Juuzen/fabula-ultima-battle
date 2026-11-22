import { Eye, EyeOff, Sparkles } from 'lucide-react'
import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { useBattleActions, useBattleStore } from '@/app/store'
import { isKnockedOut, type Combatant } from '@/domain'
import { ResourceGauge, StateTag } from '@/features/display'
import { Menu } from '@/shared/ui/Menu'

import { useActionDraft } from '../action/actionDraft'
import { EditCombatantForm } from './EditCombatantForm'
import { QuickActions } from './QuickActions'
import { StatusPopover } from './StatusPopover'
import { TargetControls } from './TargetControls'

/** Enemies only: whether the players see this foe's exact PV/PM. */
function RevealSwitch({ combatant }: { combatant: Combatant }) {
  const { t } = useTranslation()
  const { dispatch } = useBattleActions()
  const revealAll = useBattleStore((s) => s.battle.presentation.revealAllEnemyStats)
  const on = revealAll || combatant.revealStats
  const Icon = on ? Eye : EyeOff
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={t('master.combatant.reveal')}
      title={revealAll ? t('master.combatant.revealedByAll') : t('master.combatant.revealHint')}
      disabled={revealAll}
      onClick={() => dispatch({ type: 'SET_REVEAL_STATS', id: combatant.id, reveal: !on })}
      className={`inline-flex h-9 w-9 items-center justify-center rounded-md transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-400 disabled:cursor-not-allowed disabled:opacity-50 ${
        on
          ? 'text-white hover:bg-slate-800'
          : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
      }`}
    >
      <Icon className="h-4 w-4" aria-hidden="true" />
    </button>
  )
}

type Props = { combatant: Combatant; index: number; count: number }

/**
 * One row per combatant: who, how they stand (the Display's own gauges), what is on them,
 * and the fast actions. Rare commands live in the "⋯" menu. In action mode the fast
 * actions give way to the target controls.
 */
export function CombatantCard({ combatant: c, index, count }: Props) {
  const { t } = useTranslation()
  const { dispatch } = useBattleActions()
  const battleActive = useBattleStore((s) => s.battle.phase === 'active')
  const actorId = useActionDraft((s) => s.actorId)
  const actAs = useActionDraft((s) => s.actAs)
  const [editing, setEditing] = useState(false)
  const menuTrigger = useRef<HTMLButtonElement>(null)

  const ko = isKnockedOut(c)
  const composing = actorId !== ''
  const acting = actorId === c.id

  const closeEditor = () => {
    setEditing(false)
    // The form unmounts: give focus back to the menu that opened it.
    requestAnimationFrame(() => menuTrigger.current?.focus())
  }

  return (
    <li
      data-testid={`combatant-${c.id}`}
      aria-label={c.name}
      className={`@container rounded-lg border bg-slate-950/60 px-3 py-2.5 transition-colors ${
        acting
          ? 'border-indigo-400 ring-1 ring-indigo-400/60'
          : ko
            ? 'border-red-900/70'
            : 'border-slate-800'
      }`}
    >
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <div className="flex w-44 min-w-0 items-center gap-2 @4xl:w-56">
          <h3
            title={c.name}
            className={`font-display truncate text-lg font-semibold ${ko ? 'text-red-400 line-through' : 'text-white'}`}
          >
            {c.name}
          </h3>
          <StateTag combatant={c} size="sm" />
          {acting && (
            <span className="shrink-0 rounded-sm bg-indigo-500/25 px-1.5 py-px text-xs font-semibold tracking-wide text-indigo-100 uppercase">
              {t('master.combatant.acting')}
            </span>
          )}
        </div>

        <div className="flex max-w-md min-w-56 flex-1 items-center gap-4">
          <ResourceGauge
            kind="hp"
            label={t('display.hp')}
            value={c.hp}
            max={c.maxHp}
            layout="inline"
          />
          {c.maxMp > 0 && (
            <ResourceGauge
              kind="mp"
              label={t('display.mp')}
              value={c.mp}
              max={c.maxMp}
              layout="inline"
            />
          )}
        </div>

        <div className="ml-auto flex flex-wrap items-center gap-1.5">
          <StatusPopover combatant={c} />
          {composing ? <TargetControls combatant={c} /> : <QuickActions combatant={c} />}
          {c.side === 'enemy' && <RevealSwitch combatant={c} />}
          <button
            type="button"
            aria-label={t('master.combatant.act')}
            title={
              battleActive
                ? t('master.combatant.actHint', { name: c.name })
                : t('master.combatant.actDisabled')
            }
            aria-pressed={acting}
            disabled={!battleActive}
            onClick={() => actAs(c.id)}
            className={`inline-flex h-9 w-9 items-center justify-center rounded-md transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-400 disabled:cursor-not-allowed disabled:opacity-40 ${
              acting
                ? 'bg-indigo-600 text-white'
                : 'text-slate-300 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <Sparkles className="h-4 w-4" aria-hidden="true" />
          </button>
          <Menu
            label={t('master.combatant.more', { name: c.name })}
            triggerRef={menuTrigger}
            items={[
              { label: t('master.combatant.edit'), onSelect: () => setEditing(true) },
              {
                label: t('master.combatant.moveUp'),
                disabled: index === 0,
                onSelect: () => dispatch({ type: 'MOVE_COMBATANT', id: c.id, toIndex: index - 1 }),
              },
              {
                label: t('master.combatant.moveDown'),
                disabled: index === count - 1,
                onSelect: () => dispatch({ type: 'MOVE_COMBATANT', id: c.id, toIndex: index + 1 }),
              },
              {
                label: t('master.combatant.remove'),
                danger: true,
                onSelect: () => dispatch({ type: 'REMOVE_COMBATANT', id: c.id }),
              },
            ]}
          />
        </div>
      </div>

      {editing && (
        <div className="mt-3 border-t border-slate-800 pt-3">
          <EditCombatantForm combatant={c} onDone={closeEditor} />
        </div>
      )}
    </li>
  )
}
