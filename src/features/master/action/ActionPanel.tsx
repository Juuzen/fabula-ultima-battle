import { Sparkles } from 'lucide-react'
import { useEffect, useRef, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'

import { useBattleActions, useBattleStore, useCombatants } from '@/app/store'
import {
  ACTION_KINDS,
  BUILTIN_EFFECTS,
  STATUS_IDS,
  type Action,
  type Combatant,
  type EffectId,
} from '@/domain'
import { StatusIcon } from '@/features/display'
import { parseWholeNumber } from '@/shared/lib/numbers'
import { Button } from '@/shared/ui/Button'
import { NumberField, TextField } from '@/shared/ui/fields'
import { Panel } from '@/shared/ui/Panel'

import { useActionDraft } from './actionDraft'

const SELECT =
  'h-10 w-full rounded-md border border-slate-600 bg-slate-950 px-3 text-slate-100 focus:border-indigo-400 focus:outline-none disabled:opacity-40'

type Problem = 'chooseTargets' | 'notEnoughMp' | null

/** Turns the draft into a valid Action, or says what is missing. */
function useBuiltAction(all: Combatant[]): { action: Action | null; problem: Problem } {
  const draft = useActionDraft()
  const actor = all.find((c) => c.id === draft.actorId)
  const targets = Object.entries(draft.targets)
    .filter(([id]) => all.some((c) => c.id === id)) // ignore removed combatants
    .map(([id, amount]) => ({ id, amount: parseWholeNumber(amount) }))
  // The MP cost field is hidden for actors without MP: whatever is left in it must not count.
  const mpCost =
    !actor || actor.maxMp === 0 || draft.mpCost.trim() === '' ? 0 : parseWholeNumber(draft.mpCost)

  if (!actor || mpCost === null) return { action: null, problem: null }
  if (targets.length === 0 || targets.some((t) => t.amount === null)) {
    return { action: null, problem: 'chooseTargets' }
  }
  if (mpCost > actor.mp) return { action: null, problem: 'notEnoughMp' }
  return {
    problem: null,
    action: {
      actorId: actor.id,
      name: draft.name.trim(),
      effect: draft.effect,
      kind: draft.kind,
      mpCost,
      statuses: draft.statuses,
      targets: targets.map((t) => ({ id: t.id, amount: t.amount! })),
    },
  }
}

function TargetRow({ combatant, disabled }: { combatant: Combatant; disabled: boolean }) {
  const { t } = useTranslation()
  const selected = useActionDraft((s) => combatant.id in s.targets)
  const amount = useActionDraft((s) => s.targets[combatant.id] ?? '')
  const { toggleTarget, setAmount } = useActionDraft()

  return (
    <li className="flex items-center gap-3">
      <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-2 text-sm text-slate-200">
        <input
          type="checkbox"
          className="h-4 w-4 accent-indigo-500"
          checked={selected}
          disabled={disabled}
          onChange={() => toggleTarget(combatant.id)}
        />
        <span className="truncate">{combatant.name}</span>
      </label>
      <NumberField
        label={t('master.action.amount', { name: combatant.name })}
        hideLabel
        value={amount}
        onValueChange={(v) => setAmount(combatant.id, v)}
        disabled={disabled || !selected}
        className="w-24"
      />
    </li>
  )
}

/**
 * Composes a choreographed action: who acts, how it looks, what it does and to whom.
 * Performing it plays the full sequence on the player screen (phase 6).
 */
export function ActionPanel() {
  const { t } = useTranslation()
  const { dispatch } = useBattleActions()
  const active = useBattleStore((s) => s.battle.phase === 'active')
  const allies = useCombatants('ally')
  const enemies = useCombatants('enemy')
  const all = [...allies, ...enemies]
  const draft = useActionDraft()
  const { action, problem } = useBuiltAction(all)
  const actor = all.find((c) => c.id === draft.actorId)
  const disabled = !active

  // "Act" on a combatant card brings the panel into view.
  const panelRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (draft.focusRequest === 0) return
    panelRef.current?.scrollIntoView?.({ behavior: 'smooth', block: 'start' })
    panelRef.current?.querySelector<HTMLElement>('input[type=text]')?.focus()
  }, [draft.focusRequest])

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (!action) return
    if (dispatch({ type: 'PERFORM_ACTION', action }).ok) draft.clearAmounts()
  }

  return (
    <div ref={panelRef} className="scroll-mt-24">
      <Panel title={t('master.action.title')}>
        <form
          onSubmit={submit}
          aria-label={t('master.action.title')}
          className="flex flex-col gap-4"
        >
          {!active && <p className="text-xs text-amber-300">{t('master.action.notActive')}</p>}

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label
                htmlFor="action-actor"
                className="text-xs font-medium tracking-wide text-slate-400 uppercase"
              >
                {t('master.action.actor')}
              </label>
              <select
                id="action-actor"
                className={SELECT}
                value={draft.actorId}
                disabled={disabled}
                onChange={(e) => draft.setActor(e.target.value)}
              >
                <option value="">{t('master.action.chooseActor')}</option>
                {[
                  ['master.party', allies],
                  ['master.enemies', enemies],
                ].map(([group, list]) => (
                  <optgroup key={group as string} label={t(group as 'master.party')}>
                    {(list as Combatant[]).map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>
            <TextField
              label={t('master.action.name')}
              placeholder={t('master.action.namePlaceholder')}
              value={draft.name}
              maxLength={60}
              disabled={disabled}
              onChange={(e) => draft.setName(e.target.value)}
            />

            <div className="flex flex-col gap-1">
              <label
                htmlFor="action-effect"
                className="text-xs font-medium tracking-wide text-slate-400 uppercase"
              >
                {t('master.action.effect')}
              </label>
              <select
                id="action-effect"
                className={SELECT}
                value={draft.effect}
                disabled={disabled}
                onChange={(e) => draft.setEffect(e.target.value as EffectId)}
              >
                {BUILTIN_EFFECTS.map((effect) => (
                  <option key={effect} value={effect}>
                    {t(`effects.${effect}`)}
                  </option>
                ))}
              </select>
            </div>
            {actor && actor.maxMp > 0 ? (
              <NumberField
                label={`${t('master.action.mpCost')} (${t('master.action.mpAvailable', { mp: actor.mp })})`}
                value={draft.mpCost}
                onValueChange={draft.setMpCost}
                disabled={disabled}
              />
            ) : (
              <div />
            )}
          </div>

          <div
            role="radiogroup"
            aria-label={t('master.action.kind')}
            className="inline-flex self-start rounded-md bg-slate-950 p-1 ring-1 ring-slate-700"
          >
            {ACTION_KINDS.map((kind) => (
              <button
                key={kind}
                type="button"
                role="radio"
                aria-checked={draft.kind === kind}
                disabled={disabled}
                onClick={() => draft.setKind(kind)}
                className={`rounded px-3 py-1.5 text-sm font-medium transition-colors disabled:opacity-40 ${
                  draft.kind === kind
                    ? 'bg-indigo-600 text-white'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                {t(`master.action.kinds.${kind}`)}
              </button>
            ))}
          </div>

          <fieldset className="flex flex-col gap-2" disabled={disabled}>
            <legend className="mb-1 text-xs font-medium tracking-wide text-slate-400 uppercase">
              {t('master.action.targets')}
            </legend>
            {[
              ['master.party', allies],
              ['master.enemies', enemies],
            ].map(([group, list]) =>
              (list as Combatant[]).length === 0 ? null : (
                <div key={group as string}>
                  <p className="mb-1 text-xs text-slate-500">{t(group as 'master.party')}</p>
                  <ul className="flex flex-col gap-1.5">
                    {(list as Combatant[]).map((c) => (
                      <TargetRow key={c.id} combatant={c} disabled={disabled} />
                    ))}
                  </ul>
                </div>
              ),
            )}
          </fieldset>

          <div
            role="group"
            aria-label={t('master.action.statuses')}
            className="flex flex-col gap-1"
          >
            <span className="text-xs font-medium tracking-wide text-slate-400 uppercase">
              {t('master.action.statuses')}
            </span>
            <div className="flex gap-1.5">
              {STATUS_IDS.map((status) => {
                const on = draft.statuses.includes(status)
                return (
                  <button
                    key={status}
                    type="button"
                    aria-pressed={on}
                    title={t(`status.${status}`)}
                    disabled={disabled}
                    onClick={() => draft.toggleStatus(status)}
                    className={`rounded-full p-0.5 transition disabled:opacity-20 ${
                      on ? '' : 'opacity-30 grayscale hover:opacity-70'
                    }`}
                  >
                    <StatusIcon status={status} size={28} />
                  </button>
                )
              })}
            </div>
          </div>

          {problem && actor && (
            <p className="text-xs text-rose-300">
              {t(`master.action.${problem}`, { mp: actor.mp })}
            </p>
          )}
          <Button type="submit" variant="primary" disabled={disabled || !action}>
            <Sparkles className="h-4 w-4" aria-hidden="true" />
            {t('master.action.perform')}
          </Button>
        </form>
      </Panel>
    </div>
  )
}
