import { useId } from 'react'
import { useTranslation } from 'react-i18next'

import {
  ACTION_KINDS,
  BUILTIN_EFFECTS,
  STATUS_IDS,
  type ActionKind,
  type EffectId,
  type StatusId,
} from '@/domain'
import { StatusIcon } from '@/features/display'

export const SELECT =
  'h-10 w-full rounded-md border border-slate-600 bg-slate-950 px-3 text-slate-100 focus:border-indigo-400 focus:outline-none disabled:opacity-40'

const LABEL = 'text-xs font-medium tracking-wide text-slate-400 uppercase'

type EffectSelectProps = {
  value: EffectId
  onChange: (effect: EffectId) => void
  disabled?: boolean
  id?: string
}

/** Visual effect played on impact. */
export function EffectSelect({ value, onChange, disabled, id }: EffectSelectProps) {
  const { t } = useTranslation()
  const fallbackId = useId()
  const selectId = id ?? fallbackId
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={selectId} className={LABEL}>
        {t('master.action.effect')}
      </label>
      <select
        id={selectId}
        className={SELECT}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value as EffectId)}
      >
        {BUILTIN_EFFECTS.map((effect) => (
          <option key={effect} value={effect}>
            {t(`effects.${effect}`)}
          </option>
        ))}
      </select>
    </div>
  )
}

type KindPickerProps = {
  value: ActionKind
  onChange: (kind: ActionKind) => void
  disabled?: boolean
}

/** Damage PV / heal PV / damage PM, as a segmented control. */
export function KindPicker({ value, onChange, disabled }: KindPickerProps) {
  const { t } = useTranslation()
  return (
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
          aria-checked={value === kind}
          disabled={disabled}
          onClick={() => onChange(kind)}
          className={`rounded px-3 py-1.5 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-indigo-400 disabled:opacity-40 ${
            value === kind ? 'bg-indigo-600 text-white' : 'text-slate-300 hover:text-white'
          }`}
        >
          {t(`master.action.kinds.${kind}`)}
        </button>
      ))}
    </div>
  )
}

type StatusPickerProps = {
  value: readonly StatusId[]
  onToggle: (status: StatusId) => void
  disabled?: boolean
}

/** Statuses applied on impact, drawn with the icons the players see. */
export function StatusPicker({ value, onToggle, disabled }: StatusPickerProps) {
  const { t } = useTranslation()
  return (
    <div role="group" aria-label={t('master.action.statuses')} className="flex flex-col gap-1">
      <span className={LABEL}>{t('master.action.statuses')}</span>
      <div className="flex gap-1.5">
        {STATUS_IDS.map((status) => {
          const on = value.includes(status)
          return (
            <button
              key={status}
              type="button"
              aria-pressed={on}
              title={t(`status.${status}`)}
              disabled={disabled}
              onClick={() => onToggle(status)}
              className={`rounded-full p-0.5 transition focus-visible:outline-2 focus-visible:outline-indigo-400 disabled:opacity-20 ${
                on ? '' : 'opacity-30 grayscale hover:opacity-70'
              }`}
            >
              <StatusIcon status={status} size={28} />
            </button>
          )
        })}
      </div>
    </div>
  )
}
