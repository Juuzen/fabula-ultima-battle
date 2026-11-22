import type { TFunction } from 'i18next'
import { ArrowLeft, Sparkles } from 'lucide-react'
import { type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'

import { useBattleActions, useBattleStore } from '@/app/store'
import type { Combatant } from '@/domain'
import { Button } from '@/shared/ui/Button'
import { NumberField, TextField } from '@/shared/ui/fields'

import { useActionDraft } from '../action/actionDraft'
import { buildAction, type ActionProblem } from '../action/buildAction'
import { EffectSelect } from '../action/pickers'
import { TargetChecklist } from './TargetChecklist'

function footerText(
  t: TFunction,
  problem: ActionProblem | null,
  targets: number,
  actor: Combatant | undefined,
) {
  if (problem === 'notEnoughMp') return t('master.action.notEnoughMp', { mp: actor?.mp ?? 0 })
  if (problem === 'chooseTargets') return t('master.action.pickTargets')
  if (problem === 'emptyTarget') return t('master.action.emptyTarget')
  if (problem === 'badNumber') return t('master.action.badNumber')
  return t('master.action.targetsCount', { count: targets })
}

/**
 * Composes an action: what it is called, how it looks, who it hits and what it does to
 * each of them. Without an actor it is the GM's own doing. "Agisci" applies it and plays
 * it on the player screen.
 */
export function ActionComposer({ actor }: { actor: Combatant | undefined }) {
  const { t } = useTranslation()
  const { dispatch } = useBattleActions()
  const all = useBattleStore((s) => s.battle.combatants)
  const preparing = useBattleStore((s) => s.battle.phase === 'preparation')
  const draft = useActionDraft()
  const built = buildAction(draft, all)
  const targetCount = Object.keys(draft.targets).filter((id) => all.some((c) => c.id === id)).length
  const ok = built.problem === null

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (!built.action) return
    if (dispatch({ type: 'PERFORM_ACTION', action: built.action }).ok) draft.done()
  }

  const title = actor
    ? draft.abilityId
      ? draft.name || t('master.action.free')
      : t('master.action.free')
    : t('master.action.gmTitle')

  return (
    <form
      onSubmit={submit}
      aria-label={
        actor ? t('master.action.acting', { name: actor.name }) : t('master.action.gmTitle')
      }
      className="flex min-h-0 flex-1 flex-col"
    >
      <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto p-4">
        <div className="flex items-start gap-3">
          {actor && (
            <Button
              variant="ghost"
              size="sm"
              onClick={draft.back}
              title={t('master.action.backHint')}
            >
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              {t('master.action.back')}
            </Button>
          )}
          <div className="min-w-0">
            <h3 className="font-display truncate text-xl font-bold tracking-wide text-white">
              {title}
            </h3>
            <p className="text-sm text-slate-400">
              {actor
                ? t('master.action.actingHint', { name: actor.name })
                : t('master.action.gmHint')}
            </p>
          </div>
        </div>

        <div className="grid gap-3 @2xl:grid-cols-[minmax(0,1fr)_14rem_auto]">
          <TextField
            label={actor ? t('master.action.name') : t('master.action.nameOptional')}
            placeholder={
              actor ? t('master.action.namePlaceholder') : t('master.action.gmNamePlaceholder')
            }
            value={draft.name}
            maxLength={60}
            onChange={(e) => draft.setName(e.target.value)}
          />
          <EffectSelect id="action-effect" value={draft.effect} onChange={draft.setEffect} />
          {actor && actor.maxMp > 0 && (
            <NumberField
              label={`${t('master.action.mpCost')} (${t('master.action.mpAvailable', { mp: actor.mp })})`}
              value={draft.mpCost}
              placeholder={
                draft.mpCostHint === null
                  ? undefined
                  : t('master.action.hintMp', { n: draft.mpCostHint })
              }
              onValueChange={draft.setMpCost}
              className="@2xl:w-44"
            />
          )}
        </div>

        <TargetChecklist combatants={all} amountHint={draft.amountHint} />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-800 bg-slate-900 px-4 py-3">
        <div className="min-w-0">
          <p
            role="status"
            className={`text-sm ${built.problem === 'notEnoughMp' || built.problem === 'badNumber' ? 'text-rose-300' : 'text-slate-300'}`}
          >
            {footerText(t, built.problem, targetCount, actor)}
          </p>
          {preparing && <p className="text-xs text-amber-300">{t('master.action.preparing')}</p>}
        </div>
        <Button type="submit" variant="primary" disabled={!ok}>
          <Sparkles className="h-4 w-4" aria-hidden="true" />
          {t('master.action.perform')}
        </Button>
      </div>
    </form>
  )
}
