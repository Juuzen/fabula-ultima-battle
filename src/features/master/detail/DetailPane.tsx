import { ChevronRight, NotebookText, PenLine, X } from 'lucide-react'
import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'

import { useUnit } from '@/app/library/hooks'
import { useBattleStore } from '@/app/store'
import type { Ability, Combatant, Unit } from '@/domain'
import { ResourceGauge, StateTag, StatusIcons } from '@/features/display'
import { Button } from '@/shared/ui/Button'

import { useActionDraft } from '../action/actionDraft'
import { ActionComposer } from './ActionComposer'

function AbilityMeta({ ability }: { ability: Ability }) {
  const { t } = useTranslation()
  const parts = [
    ability.kind ? t(`master.action.kinds.${ability.kind}`) : t('master.action.kinds.none'),
    ability.effect ? t(`effects.${ability.effect}`) : t('effects.none'),
    ability.mpCostHint !== null && t('master.ability.mpHint', { n: ability.mpCostHint }),
    ability.amountHint !== null && t('master.ability.amountHint', { n: ability.amountHint }),
  ].filter(Boolean)
  return (
    <span className="flex flex-wrap items-center gap-x-2 text-sm text-slate-400 tabular-nums">
      {parts.join(' · ')}
      {ability.statuses.length > 0 && <StatusIcons statuses={ability.statuses} size={18} />}
    </span>
  )
}

/** What the selected combatant can do: its sheet's saved abilities, then a free action. */
function AbilityList({ actor, unit }: { actor: Combatant; unit: Unit | undefined }) {
  const { t } = useTranslation()
  const openAbility = useActionDraft((s) => s.openAbility)
  const abilities = unit?.abilities ?? []

  return (
    <div className="flex flex-col gap-2">
      <h3 className="text-xs font-medium tracking-wide text-slate-400 uppercase">
        {t('master.ability.title')}
      </h3>
      {abilities.length === 0 && actor.unitId !== null && unit !== undefined && (
        <p className="text-sm text-slate-500">{t('master.ability.none')}</p>
      )}
      <ul className="flex flex-col gap-1.5">
        {abilities.map((a) => (
          <li key={a.id}>
            <button
              type="button"
              onClick={() => openAbility(a)}
              className="group flex w-full items-center gap-3 rounded-lg bg-slate-950/60 px-4 py-3 text-left ring-1 ring-slate-800 transition-colors hover:bg-slate-900 hover:ring-indigo-400/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-400"
            >
              <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="font-display truncate text-base font-semibold text-white">
                  {a.name}
                </span>
                <AbilityMeta ability={a} />
              </span>
              <ChevronRight
                className="h-4 w-4 shrink-0 text-slate-500 group-hover:text-indigo-300"
                aria-hidden="true"
              />
            </button>
          </li>
        ))}
        <li>
          <button
            type="button"
            onClick={() => openAbility(null)}
            className="group flex w-full items-center gap-3 rounded-lg border border-dashed border-slate-600 px-4 py-3 text-left transition-colors hover:border-indigo-400/70 hover:bg-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-400"
          >
            <PenLine className="h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="font-medium text-slate-100">{t('master.action.free')}</span>
              <span className="text-sm text-slate-400">{t('master.ability.freeHint')}</span>
            </span>
            <ChevronRight
              className="h-4 w-4 shrink-0 text-slate-500 group-hover:text-indigo-300"
              aria-hidden="true"
            />
          </button>
        </li>
      </ul>
    </div>
  )
}

/** Who is selected and how they stand, with the GM's notes from the sheet. */
function ActorHeader({ actor, unit }: { actor: Combatant; unit: Unit | undefined }) {
  const { t } = useTranslation()
  const select = useActionDraft((s) => s.select)
  const notes = unit?.notes.trim() ?? ''

  return (
    <div className="flex flex-col gap-3 border-b border-slate-800 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-1">
          <div className="flex min-w-0 items-center gap-2">
            <h2 className="font-display truncate text-2xl font-bold tracking-wide text-white">
              {actor.name}
            </h2>
            <StateTag combatant={actor} size="sm" />
          </div>
          {actor.statuses.length > 0 && <StatusIcons statuses={actor.statuses} size={22} />}
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => select('')}
          title={t('master.detail.deselectHint')}
        >
          <X className="h-4 w-4" aria-hidden="true" />
          {t('master.detail.deselect')}
        </Button>
      </div>
      <div className="flex max-w-xl items-center gap-4">
        <ResourceGauge
          kind="hp"
          label={t('display.hp')}
          value={actor.hp}
          max={actor.maxHp}
          layout="inline"
        />
        {actor.maxMp > 0 && (
          <ResourceGauge
            kind="mp"
            label={t('display.mp')}
            value={actor.mp}
            max={actor.maxMp}
            layout="inline"
          />
        )}
      </div>
      {notes && (
        <details className="group text-sm text-slate-300">
          <summary className="inline-flex cursor-pointer items-center gap-1.5 text-slate-400 hover:text-slate-200">
            <NotebookText className="h-4 w-4" aria-hidden="true" />
            {t('master.detail.notes')}
          </summary>
          <p className="mt-2 max-w-prose whitespace-pre-line">{notes}</p>
        </details>
      )}
    </div>
  )
}

/**
 * Right pane of the cockpit. Nobody selected: the GM's own action. Someone selected: their
 * abilities, then the composer for the one picked. Escape steps back one level.
 */
export function DetailPane() {
  const { t } = useTranslation()
  const selectedId = useActionDraft((s) => s.selectedId)
  const view = useActionDraft((s) => s.view)
  const select = useActionDraft((s) => s.select)
  const back = useActionDraft((s) => s.back)
  const actor = useBattleStore((s) => s.battle.combatants.find((c) => c.id === selectedId))
  // Read once here, so going back and forth between list and composer never reloads it.
  const unit = useUnit(actor?.unitId ?? null)

  // The selected combatant left the field: back to the GM.
  useEffect(() => {
    if (selectedId && !actor) select('')
  }, [selectedId, actor, select])

  // Escape steps back (menus and popovers consume their own Escape first).
  useEffect(() => {
    if (!selectedId) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || e.defaultPrevented) return
      if (view === 'compose') back()
      else select('')
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [selectedId, view, back, select])

  return (
    <section
      aria-label={t('master.detail.title')}
      className="@container flex min-h-0 flex-col overflow-hidden rounded-xl border border-slate-800 bg-slate-900/80"
    >
      {actor && <ActorHeader actor={actor} unit={unit} />}
      {actor && view === 'abilities' ? (
        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          <AbilityList actor={actor} unit={unit} />
        </div>
      ) : (
        <ActionComposer key={selectedId || 'gm'} actor={actor} />
      )}
    </section>
  )
}
