import { isInCrisis, isKnockedOut } from '@/domain'

type Props = {
  kind: 'hp' | 'mp'
  label: string
  value: number
  max: number
  size?: 'md' | 'sm'
}

function tone(kind: Props['kind'], value: number, max: number): { bar: string; text: string } {
  if (kind === 'mp') return { bar: 'from-sky-500 to-cyan-300', text: 'text-white' }
  if (isKnockedOut({ hp: value })) return { bar: 'from-red-700 to-red-500', text: 'text-red-400' }
  if (isInCrisis({ hp: value, maxHp: max })) {
    return { bar: 'from-amber-500 to-yellow-300', text: 'text-amber-300' }
  }
  return { bar: 'from-emerald-500 to-lime-300', text: 'text-white' }
}

/** Label + "value / max" + gauge, JRPG style (e.g. "PV 48 / 62"). */
export function ResourceGauge({ kind, label, value, max, size = 'md' }: Props) {
  const { bar, text } = tone(kind, value, max)
  const ratio = max > 0 ? value / max : 0

  return (
    <div className="flex flex-col gap-0.5" data-testid={`gauge-${kind}`}>
      <div className="flex items-baseline justify-between">
        <span
          className={`font-bold tracking-wide text-slate-200 ${size === 'md' ? 'text-lg' : 'text-sm'}`}
        >
          {label}
        </span>
        <span
          className={`font-semibold tabular-nums ${text} ${size === 'md' ? 'text-2xl' : 'text-base'}`}
        >
          {value}
          <span className={`text-slate-300 ${size === 'md' ? 'text-base' : 'text-xs'}`}>
            {' '}
            / {max}
          </span>
        </span>
      </div>
      <div
        role="meter"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-valuenow={value}
        className={`overflow-hidden rounded-full bg-black/60 ring-1 ring-white/30 ${
          size === 'md' ? 'h-2.5' : 'h-1.5'
        }`}
      >
        <div
          className={`h-full rounded-full bg-linear-to-r ${bar}`}
          style={{ width: `${Math.round(ratio * 1000) / 10}%` }}
        />
      </div>
    </div>
  )
}
