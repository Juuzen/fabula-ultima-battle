import { ChevronDown, ChevronUp, Grip, MoveDiagonal2, X } from 'lucide-react'
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from 'react'
import { useTranslation } from 'react-i18next'

import { useBattleStore } from '@/app/store'
import { projectForPlayers } from '@/domain'
import { PlayerScreen, ScaledStage } from '@/features/display'

import { PREVIEW_MIN_WIDTH, usePreviewWindow } from './previewWindowStore'

/** Space kept between the window and the viewport edges. */
const EDGE = 12
/** Title bar height: what stays on screen when the window is rolled up. */
const BAR = 40
/** Default distance from the bottom: clears the composer footer and its "Agisci" button. */
const FOOTER_CLEARANCE = 112
/** Keyboard step for moving and resizing (Shift = ×4). */
const STEP = 16

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max)

function useViewport() {
  const [size, setSize] = useState(() => ({ w: window.innerWidth, h: window.innerHeight }))
  useEffect(() => {
    const onResize = () => setSize({ w: window.innerWidth, h: window.innerHeight })
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])
  return size
}

/** What the players see, from the Master's own state (the waiting screen while preparing). */
function PreviewStage() {
  const battle = useBattleStore((s) => s.battle)
  const visible = useMemo(() => projectForPlayers(battle), [battle])
  return (
    <div aria-hidden="true" className="pointer-events-none overflow-hidden rounded-md">
      <ScaledStage>
        <PlayerScreen battle={visible} />
      </ScaledStage>
    </div>
  )
}

/**
 * The player-screen preview as a floating window over the Master: dragged by its title bar
 * (or moved with the arrow keys), resized from the corner keeping 16:9, rolled up to the bar.
 * It always stays inside the viewport, also after the browser window shrinks.
 */
export function FloatingPreview() {
  const { t } = useTranslation()
  const { open, minimized, position, width, close, setMinimized, moveTo, resizeTo } =
    usePreviewWindow()
  const preparing = useBattleStore((s) => s.battle.phase === 'preparation')
  const viewport = useViewport()
  // Live geometry while dragging; committed to the store on release.
  const [drag, setDrag] = useState<{ x: number; y: number; width: number } | null>(null)
  const start = useRef({ px: 0, py: 0, x: 0, y: 0, width: 0 })

  if (!open) return null

  const maxWidth = Math.max(PREVIEW_MIN_WIDTH, Math.min(viewport.w * 0.8, 1280) - EDGE * 2)
  const w = clamp(drag?.width ?? width, PREVIEW_MIN_WIDTH, maxWidth)
  // Frame (3px border ×2 + 6px padding ×2) + 16:9 stage + the bar.
  const height = minimized ? BAR : BAR + Math.round(((w - 18) * 9) / 16) + 12
  // Not moved yet: bottom-right, but above the composer's footer (where "Agisci" sits).
  const fallback = { x: viewport.w - w - EDGE * 2, y: viewport.h - height - FOOTER_CLEARANCE }
  const x = clamp(drag?.x ?? position?.x ?? fallback.x, EDGE, viewport.w - w - EDGE)
  const y = clamp(
    drag?.y ?? position?.y ?? fallback.y,
    EDGE,
    Math.max(EDGE, viewport.h - BAR - EDGE),
  )

  const begin = (e: ReactPointerEvent<HTMLElement>) => {
    if (e.button !== 0) return
    e.currentTarget.setPointerCapture(e.pointerId)
    start.current = { px: e.clientX, py: e.clientY, x, y, width: w }
    setDrag({ x, y, width: w })
  }
  const moveBar = (e: ReactPointerEvent<HTMLElement>) => {
    if (!drag) return
    const s = start.current
    setDrag({ x: s.x + e.clientX - s.px, y: s.y + e.clientY - s.py, width: s.width })
  }
  const moveCorner = (e: ReactPointerEvent<HTMLElement>) => {
    if (!drag) return
    const s = start.current
    setDrag({ x: s.x, y: s.y, width: s.width + e.clientX - s.px })
  }
  const end = () => {
    if (!drag) return
    moveTo(x, y)
    resizeTo(w)
    setDrag(null)
  }

  const onBarKey = (e: KeyboardEvent) => {
    const step = e.shiftKey ? STEP * 4 : STEP
    const delta = {
      ArrowLeft: [-step, 0],
      ArrowRight: [step, 0],
      ArrowUp: [0, -step],
      ArrowDown: [0, step],
    }[e.key]
    if (!delta) return
    e.preventDefault()
    moveTo(x + delta[0]!, y + delta[1]!)
  }
  const onCornerKey = (e: KeyboardEvent) => {
    const step = e.shiftKey ? STEP * 4 : STEP
    const delta = { ArrowLeft: -step, ArrowUp: -step, ArrowRight: step, ArrowDown: step }[e.key]
    if (delta === undefined) return
    e.preventDefault()
    moveTo(x, y)
    resizeTo(w + delta)
  }

  return (
    <section
      aria-label={t('master.preview.title')}
      data-testid="floating-preview"
      className="jrpg-window fixed z-40 flex h-auto! flex-col p-0! [text-shadow:none]"
      style={{ left: x, top: y, width: w }}
    >
      <div className="flex h-[34px] shrink-0 items-center gap-1 pr-1 pl-1">
        <div
          role="button"
          tabIndex={0}
          aria-label={t('master.preview.move')}
          title={t('master.preview.moveHint')}
          onPointerDown={begin}
          onPointerMove={moveBar}
          onPointerUp={end}
          onPointerCancel={end}
          onKeyDown={onBarKey}
          className={`flex h-full min-w-0 flex-1 touch-none items-center gap-2 rounded-md px-2 select-none focus-visible:outline-2 focus-visible:outline-indigo-300 ${drag ? 'cursor-grabbing' : 'cursor-grab'}`}
        >
          <Grip className="h-4 w-4 shrink-0 text-indigo-200/70" aria-hidden="true" />
          <span className="font-display truncate text-sm font-semibold tracking-wide text-white">
            {t('master.preview.title')}
          </span>
          {preparing && (
            <span className="truncate text-xs text-amber-200">{t('master.preview.waiting')}</span>
          )}
        </div>
        <button
          type="button"
          aria-label={t(minimized ? 'master.preview.expand' : 'master.preview.minimize')}
          title={t(minimized ? 'master.preview.expand' : 'master.preview.minimize')}
          aria-expanded={!minimized}
          onClick={() => setMinimized(!minimized)}
          className="inline-flex h-7 w-7 items-center justify-center rounded-md text-indigo-100 transition-colors hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-indigo-300"
        >
          {minimized ? (
            <ChevronUp className="h-4 w-4" aria-hidden="true" />
          ) : (
            <ChevronDown className="h-4 w-4" aria-hidden="true" />
          )}
        </button>
        <button
          type="button"
          aria-label={t('master.preview.close')}
          title={t('master.preview.close')}
          onClick={close}
          className="inline-flex h-7 w-7 items-center justify-center rounded-md text-indigo-100 transition-colors hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-indigo-300"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>

      {!minimized && (
        <div className="relative px-1.5 pb-1.5">
          <PreviewStage />
          <div
            role="button"
            tabIndex={0}
            aria-label={t('master.preview.resize')}
            title={t('master.preview.resizeHint')}
            onPointerDown={begin}
            onPointerMove={moveCorner}
            onPointerUp={end}
            onPointerCancel={end}
            onKeyDown={onCornerKey}
            className="absolute right-0 bottom-0 flex h-6 w-6 cursor-nwse-resize touch-none items-center justify-center rounded-tl-md rounded-br-lg bg-[#0c1446]/90 text-indigo-100 focus-visible:outline-2 focus-visible:outline-indigo-300"
          >
            <MoveDiagonal2 className="h-3.5 w-3.5" aria-hidden="true" />
          </div>
        </div>
      )}
    </section>
  )
}
