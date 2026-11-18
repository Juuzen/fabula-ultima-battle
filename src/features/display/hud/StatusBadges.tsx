import { useTranslation } from 'react-i18next'

import type { StatusId } from '@/domain'

import { STATUS_STYLE } from '../statusStyle'

type Props = { statuses: StatusId[]; size?: 'sm' | 'md'; wrap?: boolean }

export function StatusBadges({ statuses, size = 'md', wrap = true }: Props) {
  const { t } = useTranslation()
  if (statuses.length === 0) return null

  return (
    <ul className={`flex gap-1.5 ${wrap ? 'flex-wrap' : 'flex-nowrap'}`}>
      {statuses.map((status) => (
        <li
          key={status}
          className={`rounded-sm px-2 font-semibold tracking-wide uppercase shadow ring-1 ${
            size === 'sm' ? 'py-0.5 text-sm' : 'py-1 text-base'
          } ${STATUS_STYLE[status]}`}
        >
          {t(`status.${status}`)}
        </li>
      ))}
    </ul>
  )
}
