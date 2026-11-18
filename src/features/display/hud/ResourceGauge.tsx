import { useState } from 'react'

import { isInCrisis, isKnockedOut } from '@/domain'

import { AnimatedNumber } from './AnimatedNumber'

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

type Direction = 'down' | 'up' | 'none'

/** Remembers whether the gauge last went down or up ("derive from previous props"). */
function useDirection(ratio: number): Direction {
  const [previous, setPrevious] = useState(ratio)
  const [direction, setDirection] = useState<Direction>('none')
  if (ratio !== previous) {
    setPrevious(ratio)
    setDirection(ratio < previous ? 'down' : 'up')
  }
  return direction
}

type BarProps = {
  ratio: number
  colour: string
  label: string
  value: number
  max: number
  height: string
}

/**
 * JRPG gauge with a "trail": on damage the bar drops at once and a pale chunk drains
 * after it; on healing a pale preview grows first and the bar fills up behind it.
 */
function Bar({ ratio, colour, label, value, max, height }: BarProps) {
  const direction = useDirection(ratio)
  const width = `${Math.round(ratio * 1000) / 10}%`
  const trailColour = direction === 'up' ? 'bg-emerald-200/80' : 'bg-rose-100/90'

  return (
    <div
      role="meter"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={value}
      className={`relative overflow-hidden rounded-full bg-black/60 ring-1 ring-white/30 ${height}`}
    >
      <div
        data-testid="gauge-trail"
        className={`absolute inset-y-0 left-0 rounded-full motion-reduce:transition-none ${trailColour}`}
        style={{
          width,
          transition:
            direction === 'down' ? 'width 650ms ease-in-out 350ms' : 'width 250ms ease-out',
        }}
      />
      <div
        data-testid="gauge-fill"
        className={`absolute inset-y-0 left-0 rounded-full bg-linear-to-r motion-reduce:transition-none ${colour}`}
        style={{
          width,
          transition: direction === 'up' ? 'width 550ms ease-out 300ms' : 'width 200ms ease-out',
        }}
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
          <AnimatedNumber value={value} />
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
          <AnimatedNumber value={value} />
          <span className="text-base text-slate-300"> / {max}</span>
        </span>
      </div>
      <Bar ratio={ratio} colour={bar} label={label} value={value} max={max} height="h-2.5" />
    </div>
  )
}
