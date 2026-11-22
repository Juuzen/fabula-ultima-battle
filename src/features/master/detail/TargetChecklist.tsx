import { Check, Minus, Plus } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { STATUS_IDS, type Combatant, type StatusId } from '@/domain'
import { StateTag, StatusIcon } from '@/features/display'
import { NumberField } from '@/shared/ui/fields'

import { useActionDraft, type TargetDraft } from '../action/actionDraft'
import { KindSelect } from '../action/pickers'

/**
 * One status on one target: a click marks it to be added, or (when the target already has
 * it) to be removed. The badge says which; the icon is the one the players see.
 */
function StatusChoice({
  target,
  draft,
  status,
}: {
  target: Combatant
  draft: TargetDraft
  status: StatusId
}) {
  const { t } = useTranslation()
  const toggle = useActionDraft((s) => s.toggleTargetStatus)
  const has = target.statuses.includes(status)
  const adding = draft.add.includes(status)
  const removing = draft.remove.includes(status)
  const pending = adding || removing
  const name = t(`status.${status}`)

  return (
    <button
      type="button"
      aria-pressed={pending}
      aria-label={t(has ? 'master.target.removeStatus' : 'master.target.addStatus', {
        status: name,
      })}
      title={t(has ? 'master.target.removeStatus' : 'master.target.addStatus', { status: name })}
      onClick={() => toggle(target.id, status, has ? 'remove' : 'add')}
      className={`relative rounded-full p-0.5 transition focus-visible:outline-2 focus-visible:outline-indigo-400 ${
        pending
          ? ''
          : has
            ? 'opacity-70 hover:opacity-100'
            : 'opacity-25 grayscale hover:opacity-60'
      }`}
    >
      <StatusIcon status={status} size={26} />
      {pending && (
        <span
          aria-hidden="true"
          className="absolute -right-1 -bottom-1 flex h-4 w-4 items-center justify-center rounded-full bg-white text-slate-950 ring-2 ring-slate-950"
        >
          {adding ? (
            <Plus className="h-3 w-3" strokeWidth={3} />
          ) : (
            <Minus className="h-3 w-3" strokeWidth={3} />
          )}
        </span>
      )}
    </button>
  )
}

/** A checked target's outcome: kind and amount (optional), statuses to add or remove. */
function TargetOutcome({
  target,
  draft,
  amountHint,
}: {
  target: Combatant
  draft: TargetDraft
  amountHint: number | null
}) {
  const { t } = useTranslation()
  const setKind = useActionDraft((s) => s.setTargetKind)
  const setAmount = useActionDraft((s) => s.setTargetAmount)

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-slate-800 px-3 py-2.5">
      <div className="flex items-center gap-2">
        <KindSelect
          label={t('master.target.kind', { name: target.name })}
          value={draft.kind}
          onChange={(kind) => setKind(target.id, kind)}
          hasMp={target.maxMp > 0}
        />
        <NumberField
          label={t('master.action.amount', { name: target.name })}
          hideLabel
          placeholder={
            amountHint === null
              ? t('master.target.noChange')
              : t('master.action.hintMp', { n: amountHint })
          }
          value={draft.amount}
          onValueChange={(amount) => setAmount(target.id, amount)}
          className="w-28"
        />
      </div>
      <div
        role="group"
        aria-label={t('master.target.statuses', { name: target.name })}
        className="flex gap-1"
      >
        {STATUS_IDS.map((status) => (
          <StatusChoice key={status} target={target} draft={draft} status={status} />
        ))}
      </div>
    </div>
  )
}

function TargetRow({ target, amountHint }: { target: Combatant; amountHint: number | null }) {
  const { t } = useTranslation()
  const draft = useActionDraft((s) => s.targets[target.id])
  const toggle = useActionDraft((s) => s.toggleTarget)
  const checked = draft !== undefined

  return (
    <li
      className={`overflow-hidden rounded-lg transition-colors ${
        checked
          ? 'bg-slate-950/80 ring-1 ring-indigo-400/70'
          : 'bg-slate-950/40 ring-1 ring-slate-800'
      }`}
    >
      <button
        type="button"
        role="checkbox"
        aria-checked={checked}
        aria-label={t('master.target.toggle', { name: target.name })}
        onClick={() => toggle(target.id)}
        className="flex w-full items-center gap-3 px-3 py-2 text-left focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-indigo-400"
      >
        <span
          aria-hidden="true"
          className={`flex h-5 w-5 shrink-0 items-center justify-center rounded ring-1 ${
            checked ? 'bg-indigo-500 text-white ring-indigo-400' : 'ring-slate-500'
          }`}
        >
          {checked && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
        </span>
        <span className="font-display min-w-0 flex-1 truncate font-semibold text-slate-100">
          {target.name}
        </span>
        <StateTag combatant={target} size="sm" />
        <span className="shrink-0 text-sm text-slate-400 tabular-nums">
          {t('display.hp')} {target.hp}/{target.maxHp}
          {target.maxMp > 0 && ` · ${t('display.mp')} ${target.mp}/${target.maxMp}`}
        </span>
      </button>
      {draft && <TargetOutcome target={target} draft={draft} amountHint={amountHint} />}
    </li>
  )
}

/** Everyone on the field, grouped by side: check the targets, then set each outcome. */
export function TargetChecklist({
  combatants,
  amountHint,
}: {
  combatants: Combatant[]
  amountHint: number | null
}) {
  const { t } = useTranslation()
  const groups = [
    { side: 'ally', title: t('master.party') },
    { side: 'enemy', title: t('master.enemies') },
  ] as const

  return (
    <fieldset className="flex flex-col gap-4">
      <legend className="mb-2 text-xs font-medium tracking-wide text-slate-400 uppercase">
        {t('master.action.targets')}
      </legend>
      {combatants.length === 0 && (
        <p className="text-sm text-slate-500">{t('master.target.nobody')}</p>
      )}
      {/* Side by side when the pane is wide: shorter rows, less scrolling. */}
      <div className="grid items-start gap-4 @4xl:grid-cols-2">
        {groups.map(({ side, title }) => {
          const list = combatants.filter((c) => c.side === side)
          if (list.length === 0) return null
          return (
            <section key={side} aria-label={title} className="flex min-w-0 flex-col gap-1.5">
              <h4 className="text-sm text-slate-400">{title}</h4>
              <ul className="flex flex-col gap-1.5">
                {list.map((c) => (
                  <TargetRow key={c.id} target={c} amountHint={amountHint} />
                ))}
              </ul>
            </section>
          )
        })}
      </div>
    </fieldset>
  )
}
