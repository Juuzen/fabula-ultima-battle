import { MoreHorizontal } from 'lucide-react'
import {
  useCallback,
  useEffect,
  useEffectEvent,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
  type RefObject,
} from 'react'

import { useDismiss } from './useDismiss'

export type MenuItem = {
  label: string
  onSelect: () => void
  disabled?: boolean
  danger?: boolean
}

type Props = {
  /** Accessible name of the trigger, e.g. "Altre azioni". */
  label: string
  items: MenuItem[]
  /** Lets the owner focus the trigger later (e.g. after an inline editor closes). */
  triggerRef?: RefObject<HTMLButtonElement | null>
}

/**
 * "⋯" overflow menu (WAI-ARIA menu button): arrow keys move, Enter picks, Escape closes
 * and returns focus to the trigger.
 */
export function Menu({ label, items, triggerRef }: Props) {
  const id = useId()
  const [open, setOpen] = useState(false)
  const container = useRef<HTMLDivElement>(null)
  const ownTrigger = useRef<HTMLButtonElement | null>(null)
  const trigger = triggerRef ?? ownTrigger
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([])
  const close = useCallback(() => setOpen(false), [])
  useDismiss(open, container, close, trigger)

  const enabled = items.flatMap((item, i) => (item.disabled ? [] : [i]))

  // Opening moves focus to the first available item.
  const focusFirst = useEffectEvent(() => itemRefs.current[enabled[0] ?? 0]?.focus())
  useEffect(() => {
    if (open) focusFirst()
  }, [open])

  const onMenuKey = (e: KeyboardEvent) => {
    const current = itemRefs.current.findIndex((el) => el === document.activeElement)
    const at = enabled.indexOf(current)
    const move = (to: number) => {
      e.preventDefault()
      itemRefs.current[enabled[(to + enabled.length) % enabled.length] ?? 0]?.focus()
    }
    if (e.key === 'ArrowDown') move(at + 1)
    else if (e.key === 'ArrowUp') move(at - 1)
    else if (e.key === 'Home') move(0)
    else if (e.key === 'End') move(enabled.length - 1)
    else if (e.key === 'Tab') close()
  }

  return (
    <div ref={container} className="relative">
      <button
        ref={trigger}
        type="button"
        aria-label={label}
        title={label}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? `${id}-menu` : undefined}
        onClick={() => setOpen((o) => !o)}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown') {
            e.preventDefault()
            setOpen(true)
          }
        }}
        className="inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-300 transition-colors hover:bg-slate-800 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-400"
      >
        <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
      </button>
      {open && (
        <div
          id={`${id}-menu`}
          role="menu"
          aria-label={label}
          onKeyDown={onMenuKey}
          className="absolute top-full right-0 z-30 mt-1 flex min-w-44 flex-col rounded-lg border border-slate-700 bg-slate-900 p-1 shadow-[0_10px_30px_rgba(0,0,0,0.55)]"
        >
          {items.map((item, i) => (
            <button
              key={item.label}
              ref={(el) => {
                itemRefs.current[i] = el
              }}
              type="button"
              role="menuitem"
              tabIndex={-1}
              disabled={item.disabled}
              onClick={() => {
                close()
                item.onSelect()
              }}
              className={`rounded-md px-3 py-2 text-left text-sm transition-colors focus:outline-none focus-visible:bg-slate-800 disabled:opacity-40 ${
                item.danger
                  ? 'text-rose-300 hover:bg-rose-950/70 focus-visible:bg-rose-950/70'
                  : 'text-slate-100 hover:bg-slate-800'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
