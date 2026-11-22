import { Keyboard } from 'lucide-react'
import { Fragment, useCallback, useEffect, useId, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { useDismiss } from '@/shared/ui/useDismiss'

type Row = { keys: string[]; label: string }

/** True when the key press belongs to a field the GM is typing in. */
function isTyping(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false
  return target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)
}

function Keys({ keys }: { keys: string[] }) {
  return (
    <span className="flex shrink-0 items-center gap-1">
      {keys.map((k, i) => (
        <Fragment key={k}>
          {i > 0 && <span className="text-xs text-slate-400">+</span>}
          <kbd className="inline-flex h-6 min-w-6 items-center justify-center rounded border border-b-2 border-slate-600 bg-slate-800 px-1.5 font-sans text-xs font-semibold text-slate-100">
            {k}
          </kbd>
        </Fragment>
      ))}
    </span>
  )
}

/**
 * The keyboard accelerators, one click (or "?") away instead of hidden in tooltips.
 * A popover, not a modal: the GM reads it and keeps playing.
 */
export function ShortcutHelp() {
  const { t } = useTranslation()
  const id = useId()
  const [open, setOpen] = useState(false)
  const container = useRef<HTMLDivElement>(null)
  const trigger = useRef<HTMLButtonElement>(null)
  const close = useCallback(() => setOpen(false), [])
  useDismiss(open, container, close, trigger)

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== '?' || e.ctrlKey || e.metaKey || e.altKey || isTyping(e.target)) return
      e.preventDefault()
      setOpen((o) => !o)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  const enter = t('master.strip.keys.enter')
  const shift = t('master.strip.keys.shift')
  const groups: { title: string; rows: Row[] }[] = [
    {
      title: t('master.strip.shortcutGroups.card'),
      rows: [
        { keys: [enter], label: t('master.strip.shortcutList.damage') },
        { keys: [shift, enter], label: t('master.strip.shortcutList.heal') },
      ],
    },
    {
      title: t('master.strip.shortcutGroups.action'),
      rows: [
        { keys: [enter], label: t('master.strip.shortcutList.perform') },
        { keys: ['Esc'], label: t('master.strip.shortcutList.exitAction') },
      ],
    },
    {
      title: t('master.strip.shortcutGroups.everywhere'),
      rows: [
        { keys: ['Ctrl', 'Z'], label: t('master.strip.shortcutList.undo') },
        { keys: ['Alt', '1…6'], label: t('master.strip.shortcutList.sections') },
        { keys: ['?'], label: t('master.strip.shortcutList.help') },
        { keys: ['F11'], label: t('master.strip.shortcutList.fullscreen') },
      ],
    },
  ]

  return (
    <div ref={container} className="relative">
      <button
        ref={trigger}
        type="button"
        aria-label={t('master.strip.shortcuts')}
        title={t('master.strip.shortcutsHint')}
        aria-expanded={open}
        aria-controls={open ? `${id}-shortcuts` : undefined}
        onClick={() => setOpen((o) => !o)}
        className="inline-flex h-10 w-10 items-center justify-center rounded-md text-slate-300 ring-1 ring-slate-700 transition-colors hover:bg-slate-800 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-400 aria-expanded:bg-slate-800 aria-expanded:text-white"
      >
        <Keyboard className="h-5 w-5" aria-hidden="true" />
      </button>
      {open && (
        <section
          id={`${id}-shortcuts`}
          aria-labelledby={`${id}-title`}
          className="absolute top-full right-0 z-40 mt-2 w-[min(26rem,calc(100vw-2rem))] rounded-lg border border-slate-700 bg-slate-900 p-4 shadow-[0_12px_32px_rgba(0,0,0,0.6)]"
        >
          <h2 id={`${id}-title`} className="font-display mb-3 text-base font-semibold text-white">
            {t('master.strip.shortcutsTitle')}
          </h2>
          <div className="flex flex-col gap-4">
            {groups.map((g) => (
              <div key={g.title}>
                <h3 className="mb-1.5 text-xs font-medium tracking-wide text-slate-400 uppercase">
                  {g.title}
                </h3>
                <dl className="flex flex-col gap-1.5">
                  {g.rows.map((r) => (
                    <div key={r.label} className="flex items-center justify-between gap-4">
                      <dt className="order-last">
                        <Keys keys={r.keys} />
                      </dt>
                      <dd className="text-sm text-slate-200">{r.label}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
