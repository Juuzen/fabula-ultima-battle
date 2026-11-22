import { Sparkles, X } from 'lucide-react'
import { useEffect, useRef, type FormEvent, type RefObject } from 'react'
import { useTranslation } from 'react-i18next'

import { useUnit } from '@/app/library/hooks'
import { useBattleActions, useBattleStore } from '@/app/store'
import type { Action, Combatant } from '@/domain'
import { parseWholeNumber } from '@/shared/lib/numbers'
import { Button } from '@/shared/ui/Button'
import { NumberField, TextField } from '@/shared/ui/fields'

import { useActionDraft } from './actionDraft'
import { EffectSelect, KindPicker, SELECT, StatusPicker } from './pickers'

/**
 * While the docked bar is up, keyboard focus moving to a card must not land under it:
 * the page's scroll padding follows the bar's height.
 */
function useScrollPaddingFor(el: RefObject<HTMLElement | null>, on: boolean) {
  useEffect(() => {
    const node = el.current
    if (!on || !node) return
    const root = document.documentElement
    const update = () => {
      root.style.scrollPaddingBottom = `${node.offsetHeight + 24}px`
    }
    update()
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(update)
    observer?.observe(node)
    return () => {
      observer?.disconnect()
      root.style.scrollPaddingBottom = ''
    }
  }, [el, on])
}

/** The target amount fields on the cards submit this form (Enter = Esegui). */
export const ACTION_FORM_ID = 'action-form'

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

/**
 * Saved abilities of the actor's sheet. Picking one prefills the bar; MP cost and amount
 * stay empty, with the sheet's reminders as hints. Hidden when the actor has none.
 */
function AbilitySelect({ actorUnitId }: { actorUnitId: string | null }) {
  const { t } = useTranslation()
  const unit = useUnit(actorUnitId)
  const abilityId = useActionDraft((s) => s.abilityId)
  const applyAbility = useActionDraft((s) => s.applyAbility)
  if (!unit || unit.abilities.length === 0) return null

  return (
    <div className="flex flex-col gap-1 @xl:col-span-3">
      <label
        htmlFor="action-ability"
        className="text-xs font-medium tracking-wide text-slate-400 uppercase"
      >
        {t('master.action.ability')}
      </label>
      <select
        id="action-ability"
        className={SELECT}
        value={abilityId}
        onChange={(e) => applyAbility(unit.abilities.find((a) => a.id === e.target.value) ?? null)}
      >
        <option value="">{t('master.action.free')}</option>
        {unit.abilities.map((a) => (
          <option key={a.id} value={a.id}>
            {a.name}
          </option>
        ))}
      </select>
    </div>
  )
}

/**
 * Action mode, docked under the roster: what the actor does and how it looks. Targets and
 * amounts are picked on the cards. Esegui plays the sequence on the player screen and
 * leaves action mode; Esc or Esci leaves without acting.
 */
export function ActionBar() {
  const { t } = useTranslation()
  const { dispatch } = useBattleActions()
  const active = useBattleStore((s) => s.battle.phase === 'active')
  const all = useBattleStore((s) => s.battle.combatants)
  const draft = useActionDraft()
  const { action, problem } = useBuiltAction(all)
  const actor = all.find((c) => c.id === draft.actorId)
  const composing = draft.actorId !== ''
  const firstField = useRef<HTMLInputElement>(null)
  const bar = useRef<HTMLFormElement>(null)
  const exit = draft.exit
  useScrollPaddingFor(bar, composing && !!actor && active)

  // The actor left the field or the battle ended: nothing left to compose.
  useEffect(() => {
    if (composing && (!actor || !active)) exit()
  }, [composing, actor, active, exit])

  // Entering action mode puts the cursor in the action name.
  useEffect(() => {
    if (draft.focusRequest > 0) firstField.current?.focus()
  }, [draft.focusRequest])

  // Escape leaves action mode (menus and popovers consume their own Escape first).
  useEffect(() => {
    if (!composing) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !e.defaultPrevented) exit()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [composing, exit])

  if (!composing || !actor || !active) return null

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (!action) return
    if (dispatch({ type: 'PERFORM_ACTION', action }).ok) exit()
  }
  const targetCount = Object.keys(draft.targets).length

  return (
    <form
      ref={bar}
      id={ACTION_FORM_ID}
      onSubmit={submit}
      aria-label={t('master.action.title')}
      className="jrpg-window @container sticky bottom-3 z-20 flex h-auto flex-col gap-4 px-5 py-4"
    >
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-display text-xl font-bold tracking-wide">
          {t('master.action.acting', { name: actor.name })}
        </h2>
        <Button
          variant="ghost"
          size="sm"
          title={t('master.action.exitHint')}
          onClick={exit}
          className="text-indigo-100 [text-shadow:none] hover:bg-white/10"
        >
          <X className="h-4 w-4" aria-hidden="true" />
          {t('master.action.exit')}
        </Button>
      </div>

      <div className="grid gap-3 [text-shadow:none] @xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_13rem]">
        <AbilitySelect actorUnitId={actor.unitId} />
        <TextField
          ref={firstField}
          label={t('master.action.name')}
          placeholder={t('master.action.namePlaceholder')}
          value={draft.name}
          maxLength={60}
          onChange={(e) => draft.setName(e.target.value)}
        />
        <EffectSelect id="action-effect" value={draft.effect} onChange={draft.setEffect} />
        {actor.maxMp > 0 && (
          <NumberField
            label={`${t('master.action.mpCost')} (${t('master.action.mpAvailable', { mp: actor.mp })})`}
            value={draft.mpCost}
            placeholder={
              draft.mpCostHint === null
                ? undefined
                : t('master.action.hintMp', { n: draft.mpCostHint })
            }
            onValueChange={draft.setMpCost}
          />
        )}
      </div>

      <div className="flex flex-wrap items-end justify-between gap-4 [text-shadow:none]">
        <KindPicker value={draft.kind} onChange={draft.setKind} />
        <StatusPicker value={draft.statuses} onToggle={draft.toggleStatus} />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/15 pt-3 [text-shadow:none]">
        <p className={`text-sm ${problem === 'notEnoughMp' ? 'text-rose-200' : 'text-indigo-100'}`}>
          {problem === 'notEnoughMp'
            ? t('master.action.notEnoughMp', { mp: actor.mp })
            : targetCount === 0
              ? t('master.action.pickTargets')
              : t('master.action.targetsCount', { count: targetCount })}
        </p>
        <Button type="submit" variant="primary" disabled={!action}>
          <Sparkles className="h-4 w-4" aria-hidden="true" />
          {t('master.action.perform')}
        </Button>
      </div>
    </form>
  )
}
