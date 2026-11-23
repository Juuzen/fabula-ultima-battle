import { useCallback, useEffect, useId, useRef, useState, type ReactNode } from 'react'

import { useDismiss } from './useDismiss'

type Props = {
  /** What the trigger shows (icon and/or text). */
  trigger: ReactNode
  /** Accessible name of the trigger and of the panel. */
  label: string
  /** Tooltip of the trigger. */
  title?: string
  /** Trigger look; defaults to the secondary button. */
  triggerClassName?: string
  /** Which trigger edge the panel lines up with. */
  align?: 'start' | 'end'
  panelClassName?: string
  /** Content, or a function of `close` for panels that close themselves (e.g. after a pick). */
  children: ReactNode | ((close: () => void) => ReactNode)
}

const TRIGGER =
  'inline-flex h-10 shrink-0 items-center justify-center gap-1.5 rounded-md bg-slate-800 px-4 text-sm font-medium text-slate-100 ring-1 ring-slate-600 transition-colors hover:bg-slate-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-400 aria-expanded:bg-slate-700'

/**
 * A panel of controls anchored to a button (non-modal dialog). Opening moves focus inside;
 * Escape or a click outside closes it and Escape gives focus back to the trigger.
 */
export function Popover({
  trigger,
  label,
  title,
  triggerClassName = TRIGGER,
  align = 'end',
  panelClassName = 'w-80',
  children,
}: Props) {
  const id = useId()
  const [open, setOpen] = useState(false)
  const container = useRef<HTMLDivElement>(null)
  const button = useRef<HTMLButtonElement>(null)
  const panel = useRef<HTMLDivElement>(null)
  const close = useCallback(() => setOpen(false), [])
  useDismiss(open, container, close, button)

  useEffect(() => {
    if (!open) return
    const first = panel.current?.querySelector<HTMLElement>(
      'button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])',
    )
    ;(first ?? panel.current)?.focus()
  }, [open])

  return (
    <div ref={container} className="relative">
      <button
        ref={button}
        type="button"
        aria-label={label}
        title={title ?? label}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={open ? `${id}-panel` : undefined}
        onClick={() => setOpen((o) => !o)}
        className={triggerClassName}
      >
        {trigger}
      </button>
      {open && (
        <div
          ref={panel}
          id={`${id}-panel`}
          role="dialog"
          aria-label={label}
          tabIndex={-1}
          className={`absolute top-full z-30 mt-2 rounded-xl border border-slate-700 bg-slate-900 p-4 shadow-[0_10px_30px_rgba(0,0,0,0.55)] focus:outline-none ${
            align === 'end' ? 'right-0' : 'left-0'
          } ${panelClassName}`}
        >
          {typeof children === 'function' ? children(close) : children}
        </div>
      )}
    </div>
  )
}
