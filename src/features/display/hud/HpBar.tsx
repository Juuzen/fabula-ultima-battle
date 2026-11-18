import { isInCrisis, isKnockedOut } from '@/domain'

type Props = { hp: number; maxHp: number; className?: string }

/** Horizontal HP gauge. Colour encodes the state: healthy, Crisis (amber), KO (empty). */
export function HpBar({ hp, maxHp, className = 'h-3' }: Props) {
  const ratio = maxHp > 0 ? hp / maxHp : 0
  const tone = isKnockedOut({ hp })
    ? 'from-red-700 to-red-500'
    : isInCrisis({ hp, maxHp })
      ? 'from-amber-500 to-yellow-300'
      : 'from-emerald-500 to-lime-300'

  return (
    <div
      role="meter"
      aria-valuemin={0}
      aria-valuemax={maxHp}
      aria-valuenow={hp}
      className={`overflow-hidden rounded-full bg-black/60 ring-1 ring-white/30 ${className}`}
    >
      <div
        className={`h-full rounded-full bg-linear-to-r ${tone}`}
        style={{ width: `${Math.round(ratio * 1000) / 10}%` }}
      />
    </div>
  )
}
