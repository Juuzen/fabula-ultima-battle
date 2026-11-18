import { useTranslation } from 'react-i18next'

import { sortStatuses, STATUS_TIER, type StatusId } from '@/domain'

import { STATUS_VISUALS } from './statusVisuals'

export function StatusIcon({ status, size }: { status: StatusId; size: number }) {
  const { t } = useTranslation()
  const { icon: Icon, colour } = STATUS_VISUALS[status]
  const label = t(`status.${status}`)
  const major = STATUS_TIER[status] === 'major'

  return (
    <span
      role="img"
      aria-label={label}
      title={label}
      data-status={status}
      className="relative inline-flex shrink-0 items-center justify-center drop-shadow-[0_2px_2px_rgba(0,0,0,.6)]"
      style={{ width: size, height: size }}
    >
      {/* Basic statuses sit in a circle, major ones in a diamond. */}
      <span
        className={`absolute ring-2 ring-white/80 ${colour} ${
          major ? 'inset-[12%] rotate-45 rounded-[3px]' : 'inset-0 rounded-full'
        }`}
      />
      <Icon
        aria-hidden="true"
        className="relative text-white"
        strokeWidth={2.5}
        style={{ width: size * 0.6, height: size * 0.6 }}
      />
    </span>
  )
}

/** Status icons on a single row, in canonical order. */
export function StatusIcons({ statuses, size = 24 }: { statuses: StatusId[]; size?: number }) {
  if (statuses.length === 0) return null
  return (
    <span
      className="inline-flex items-center"
      // Spacing scales with icon size (≈8px at 26px) so icons never look cramped.
      style={{ gap: Math.round(size * 0.3) }}
      data-testid="status-icons"
    >
      {sortStatuses(statuses).map((s) => (
        <StatusIcon key={s} status={s} size={size} />
      ))}
    </span>
  )
}
