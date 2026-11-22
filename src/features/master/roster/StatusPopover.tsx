import { Plus } from 'lucide-react'
import { useCallback, useId, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import type { Combatant } from '@/domain'
import { StatusIcon } from '@/features/display'
import { useDismiss } from '@/shared/ui/useDismiss'

import { StatusToggles } from './StatusToggles'

/**
 * Only the active statuses stay on the card; the "+" trigger opens all six toggles.
 * One control instead of six faded icons.
 */
export function StatusPopover({ combatant }: { combatant: Combatant }) {
  const { t } = useTranslation()
  const id = useId()
  const [open, setOpen] = useState(false)
  const container = useRef<HTMLDivElement>(null)
  const trigger = useRef<HTMLButtonElement>(null)
  const close = useCallback(() => setOpen(false), [])
  useDismiss(open, container, close, trigger)

  const active = combatant.statuses
  const summary =
    active.length > 0
      ? active.map((s) => t(`status.${s}`)).join(', ')
      : t('master.combatant.statusesNone')

  return (
    <div ref={container} className="relative">
      <button
        ref={trigger}
        type="button"
        aria-label={`${t('master.combatant.statuses', { name: combatant.name })}: ${summary}`}
        title={summary}
        aria-expanded={open}
        aria-controls={open ? `${id}-statuses` : undefined}
        onClick={() => setOpen((o) => !o)}
        className="inline-flex h-10 min-w-10 items-center justify-center gap-0.5 rounded-md px-1.5 text-slate-300 ring-1 ring-slate-700 transition-colors hover:bg-slate-800 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-400"
      >
        {active.map((status) => (
          <StatusIcon key={status} status={status} size={24} />
        ))}
        <Plus className="h-4 w-4" aria-hidden="true" />
      </button>
      {open && (
        <div
          id={`${id}-statuses`}
          className="absolute top-full right-0 z-30 mt-1 rounded-lg border border-slate-700 bg-slate-900 p-2 shadow-[0_10px_30px_rgba(0,0,0,0.55)]"
        >
          <StatusToggles combatant={combatant} />
        </div>
      )}
    </div>
  )
}
