import { isInCrisis, isKnockedOut } from '@/domain'

type Props = {
  kind: 'hp' | 'mp'
  label: string
  value: number
  max: number
  /** stacked: label and numbers above the bar (party). inline: one compact line (enemy cards). */
  layout?: 'stacked' | 'inline'
}

function tone(kind: Props['kind'], value: number, max: number): { bar: string; text: string } {
  if (kind === 'mp') return { bar: 'from-sky-500 to-cyan-300', text: 'text-white' }
  if (isKnockedOut({ hp: value })) return { bar: 'from-red-700 to-red-500', text: 'text-red-400' }
  if (isInCrisis({ hp: value, maxHp: max })) {
    return { bar: 'from-amber-500 to-yellow-300', text: 'text-amber-300' }
  }
  return { bar: 'from-emerald-500 to-lime-300', text: 'text-white' }
}

function Bar({
  ratio,
  colour,
  label,
  value,
  max,
  height,
}: {
  ratio: number
  colour: string
  label: string
  value: number
  max: number
  height: string
}) {
  return (
    <div
      role="meter"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={value}
      className={`overflow-hidden rounded-full bg-black/60 ring-1 ring-white/30 ${height}`}
    >
      <div
        className={`h-full rounded-full bg-linear-to-r ${colour}`}
        style={{ width: `${Math.round(ratio * 1000) / 10}%` }}
      />
    </div>
  )
}

/** Label + "value / max" + gauge, JRPG style (e.g. "PV 48 / 62"). */
export function ResourceGauge({ kind, label, value, max, layout = 'stacked' }: Props) {
  const { bar, text } = tone(kind, value, max)
  const ratio = max > 0 ? value / max : 0

  if (layout === 'inline') {
    return (
      <div className="flex min-w-0 flex-1 items-center gap-1.5" data-testid={`gauge-${kind}`}>
        <span className="text-xs font-bold text-slate-300">{label}</span>
        <div className="min-w-6 flex-1">
          <Bar ratio={ratio} colour={bar} label={label} value={value} max={max} height="h-1.5" />
        </div>
        <span className={`text-sm font-semibold whitespace-nowrap tabular-nums ${text}`}>
          {value}
          <span className="text-xs text-slate-400">/{max}</span>
        </span>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-0.5" data-testid={`gauge-${kind}`}>
      <div className="flex items-baseline justify-between">
        <span className="text-lg font-bold tracking-wide text-slate-200">{label}</span>
        <span className={`text-2xl font-semibold tabular-nums ${text}`}>
          {value}
          <span className="text-base text-slate-300"> / {max}</span>
        </span>
      </div>
      <Bar ratio={ratio} colour={bar} label={label} value={value} max={max} height="h-2.5" />
    </div>
  )
}
