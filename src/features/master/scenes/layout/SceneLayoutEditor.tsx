import { Grid3x3, Magnet, PanelBottom, RotateCcw, X } from 'lucide-react'
import {
  Fragment,
  useEffect,
  useEffectEvent,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'

import { resetLayout, type LayoutKey, type SceneLayout, type Unit, type UnitId } from '@/domain'
import { BattleScene, SceneEditingContext, STAGE_WIDTH } from '@/features/display'
import { Button } from '@/shared/ui/Button'

import { SaveIndicator } from '../../library/SaveIndicator'
import type { SaveStatus } from '../../library/useAutosave'
import { EntityList } from './EntityList'
import { FitStage } from './FitStage'
import { HandlesLayer, type DragTarget, type StagePoint } from './HandlesLayer'
import { Inspector, QuickActions } from './Inspector'
import {
  keysOf,
  moveSprites,
  rotateSprites,
  scaleSprites,
  setSpriteField,
  shiftDepth,
  toggleFlip,
  transformSprites,
} from './layoutModel'
import { layoutSprites, previewBattle, type LayoutSprite, type PreviewScene } from './previewBattle'
import { GRID_STEP, NO_GUIDES, snapPoint, type Guides } from './snapping'

/** Snap distance, in screen px (converted to stage px at the current zoom). */
const SNAP_PX = 8
/** A press that moves less than this (stage px) is a click, not a drag. */
const DRAG_THRESHOLD = 2

type Drag = {
  kind: DragTarget['kind']
  origin: StagePoint
  /** Layout when the drag started: every frame is computed from it, not from the last one. */
  layout: SceneLayout
  sprites: LayoutSprite[]
  /** The sprite under the pointer (move) or the main selected one (scale, rotate). */
  anchor: LayoutSprite
  others: { x: number; y: number }[]
  moved: boolean
}

const FOCUSABLE =
  'button:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'

function isTyping(target: EventTarget | null) {
  return target instanceof HTMLElement && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)
}

const degrees = (radians: number) => (radians * 180) / Math.PI

function ToolbarToggle({
  pressed,
  onToggle,
  label,
  hint,
  children,
}: {
  pressed: boolean
  onToggle: () => void
  label: string
  hint: string
  children: ReactNode
}) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      title={hint}
      onClick={onToggle}
      className={`inline-flex h-8 items-center gap-1.5 rounded-md px-2.5 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-400 ${
        pressed
          ? 'bg-indigo-600/25 text-white ring-1 ring-indigo-500/70'
          : 'text-slate-300 hover:bg-slate-800 hover:text-white'
      }`}
    >
      {children}
      {label}
    </button>
  )
}

function ResetAll({ disabled, onReset }: { disabled: boolean; onReset: () => void }) {
  const { t } = useTranslation()
  const [armed, setArmed] = useState(false)
  if (!armed) {
    return (
      <Button size="sm" variant="ghost" disabled={disabled} onClick={() => setArmed(true)}>
        <RotateCcw className="h-4 w-4" aria-hidden="true" />
        {t('scenes.layout.reset')}
      </Button>
    )
  }
  return (
    <div className="flex items-center gap-2">
      <Button
        size="sm"
        variant="danger"
        autoFocus
        onClick={() => {
          onReset()
          setArmed(false)
        }}
      >
        {t('scenes.layout.resetConfirm')}
      </Button>
      <Button size="sm" variant="ghost" onClick={() => setArmed(false)}>
        {t('scenes.layout.resetCancel')}
      </Button>
    </div>
  )
}

function Shortcuts() {
  const { t } = useTranslation()
  const rows: [string[], string][] = [
    [['←↑→↓'], t('scenes.layout.shortcuts.move')],
    [['Q', 'E'], t('scenes.layout.shortcuts.rotate')],
    [['+', '−'], t('scenes.layout.shortcuts.scale')],
    [['F'], t('scenes.layout.actions.flip')],
    [
      [t('scenes.layout.keys.pageUp'), t('scenes.layout.keys.pageDown')],
      t('scenes.layout.shortcuts.depth'),
    ],
    [['0'], t('scenes.layout.actions.resetSelected')],
    [['Ctrl', 'A'], t('scenes.layout.shortcuts.all')],
    [['Alt'], t('scenes.layout.shortcuts.noSnap')],
    [['Esc'], t('scenes.layout.shortcuts.escape')],
  ]
  return (
    <section className="flex flex-col gap-2 border-t border-slate-800 pt-4">
      <h3 className="text-xs font-medium tracking-wide text-slate-400 uppercase">
        {t('scenes.layout.shortcuts.title')}
      </h3>
      <dl className="flex flex-col gap-1.5 text-sm">
        {rows.map(([keys, label]) => (
          <div key={label} className="flex items-center justify-between gap-3">
            <dt className="text-slate-300">{label}</dt>
            <dd className="flex shrink-0 items-center gap-1">
              {keys.map((k, i) => (
                <Fragment key={k}>
                  {i > 0 && <span className="text-xs text-slate-500">/</span>}
                  <kbd className="inline-flex h-6 min-w-6 items-center justify-center rounded border border-b-2 border-slate-600 bg-slate-800 px-1.5 font-sans text-xs font-semibold text-slate-100">
                    {k}
                  </kbd>
                </Fragment>
              ))}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  )
}

type Props = {
  scene: PreviewScene
  units: ReadonlyMap<UnitId, Unit>
  saveStatus: SaveStatus
  onChange: (layout: SceneLayout) => void
  onClose: () => void
}

/**
 * The live preview of a scene, full screen over the Master: the players' stage as it will
 * look, where the GM moves, sizes, turns, layers and mirrors each sprite. Every change goes
 * into the scene and is saved by its autosave.
 */
export function SceneLayoutEditor({ scene, units, saveStatus, onChange, onClose }: Props) {
  const { t } = useTranslation()
  const root = useRef<HTMLDivElement>(null)
  const [selection, setSelection] = useState<LayoutKey[]>([])
  const [hud, setHud] = useState(true)
  const [grid, setGrid] = useState(false)
  const [guides, setGuides] = useState(true)
  // While dragging, the layout lives here and goes to the scene on release.
  const [live, setLive] = useState<SceneLayout | null>(null)
  const [activeGuides, setActiveGuides] = useState<Guides>(NO_GUIDES)
  const drag = useRef<Drag | null>(null)

  const layout = live ?? scene.layout
  const battle = useMemo(() => previewBattle({ ...scene, layout }, units), [scene, layout, units])
  const sprites = useMemo(() => layoutSprites(battle), [battle])
  const present = new Set(sprites.map((s) => s.key))
  const chosen = selection.filter((k) => present.has(k))
  const selectedKeys = new Set(chosen)
  const selected = sprites.filter((s) => selectedKeys.has(s.key))
  const primary = sprites.find((s) => s.key === chosen.at(-1)) ?? null
  const customized = Object.values(scene.layout).some((s) => s.transform || s.depth !== null)

  // Focus moves in on open and back to the opener on close; the page behind does not scroll.
  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null
    root.current?.focus()
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = overflow
      opener?.focus()
    }
  }, [])

  const edit = (change: (layout: SceneLayout, sprites: LayoutSprite[]) => SceneLayout) => {
    if (selected.length > 0) onChange(change(scene.layout, selected))
  }
  const flip = () => edit(toggleFlip)
  const depth = (step: number) => edit((l, s) => shiftDepth(l, s, step))
  const resetSelected = () => edit((l, s) => resetLayout(l, keysOf(s)))

  const select = (key: LayoutKey, additive: boolean) => {
    if (!additive) setSelection([key])
    else if (selectedKeys.has(key)) setSelection(chosen.filter((k) => k !== key))
    else setSelection([...chosen, key])
  }

  const dragStart = (e: ReactPointerEvent<HTMLElement>, target: DragTarget, at: StagePoint) => {
    let group = selected
    let anchor = primary
    if (target.kind === 'move') {
      const { key } = target.sprite
      const additive = e.shiftKey || e.ctrlKey || e.metaKey
      let next: LayoutKey[]
      if (additive && selectedKeys.has(key)) {
        setSelection(chosen.filter((k) => k !== key))
        return
      } else if (additive) next = [...chosen, key]
      else if (selectedKeys.has(key)) next = [...chosen.filter((k) => k !== key), key]
      else next = [key]
      setSelection(next)
      group = sprites.filter((s) => next.includes(s.key))
      anchor = target.sprite
    }
    if (!anchor || group.length === 0) return
    const inGroup = keysOf(group)
    drag.current = {
      kind: target.kind,
      origin: at,
      layout: scene.layout,
      sprites: group,
      anchor,
      others: sprites.filter((s) => !inGroup.has(s.key)).map((s) => ({ x: s.slot.x, y: s.slot.y })),
      moved: false,
    }
  }

  const dragMove = (e: ReactPointerEvent<HTMLElement>, at: StagePoint, zoom: number) => {
    const d = drag.current
    if (!d) return
    const dx = at.x - d.origin.x
    const dy = at.y - d.origin.y
    if (!d.moved && Math.hypot(dx, dy) < DRAG_THRESHOLD) return
    d.moved = true
    const feet = d.anchor.slot

    if (d.kind === 'move') {
      const target = { x: feet.x + dx, y: feet.y + dy }
      const snapped = e.altKey
        ? { ...target, guides: NO_GUIDES }
        : snapPoint(target, {
            others: d.others,
            lines: [STAGE_WIDTH / 2],
            guides,
            grid: grid ? GRID_STEP : null,
            threshold: SNAP_PX / Math.max(zoom, 0.01),
          })
      setActiveGuides(snapped.guides)
      setLive(moveSprites(d.layout, d.sprites, snapped.x - feet.x, snapped.y - feet.y))
    } else if (d.kind === 'scale') {
      const before = Math.max(Math.hypot(d.origin.x - feet.x, d.origin.y - feet.y), 1)
      const factor = Math.hypot(at.x - feet.x, at.y - feet.y) / before
      setLive(transformSprites(d.layout, d.sprites, (tr) => ({ ...tr, scale: tr.scale * factor })))
    } else {
      const turn = degrees(
        Math.atan2(at.y - feet.y, at.x - feet.x) -
          Math.atan2(d.origin.y - feet.y, d.origin.x - feet.x),
      )
      // Shift: the main sprite lands on a multiple of 15°, the others turn by as much.
      const delta = e.shiftKey ? Math.round((feet.rotation + turn) / 15) * 15 - feet.rotation : turn
      setLive(rotateSprites(d.layout, d.sprites, delta))
    }
  }

  const dragEnd = () => {
    const d = drag.current
    drag.current = null
    setActiveGuides(NO_GUIDES)
    if (d?.moved && live) onChange(live)
    setLive(null)
  }

  // The editor is modal: it listens to the whole window, so keys still work when the focused
  // control disappears (e.g. the inspector's fields after deselecting).
  const onKeyDown = useEffectEvent((e: KeyboardEvent) => {
    if (e.defaultPrevented) return
    if (e.key === 'Tab') {
      // Keep focus inside the editor.
      const nodes = [...(root.current?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? [])]
      const first = nodes[0]
      const last = nodes.at(-1)
      if (!first || !last) return
      if (
        e.shiftKey &&
        (document.activeElement === first || document.activeElement === root.current)
      ) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
      return
    }
    if (e.key === 'Escape') {
      e.preventDefault()
      if (isTyping(e.target)) (e.target as HTMLElement).blur()
      else if (chosen.length > 0) {
        setSelection([])
        root.current?.focus()
      } else onClose()
      return
    }
    if (isTyping(e.target) || e.altKey) return

    const big = e.shiftKey
    const key = e.key.toLowerCase()
    const arrows: Record<string, [number, number]> = {
      arrowleft: [-1, 0],
      arrowright: [1, 0],
      arrowup: [0, -1],
      arrowdown: [0, 1],
    }
    let handled = true
    if ((e.ctrlKey || e.metaKey) && key === 'a') {
      setSelection(sprites.map((s) => s.key))
    } else if (e.ctrlKey || e.metaKey) {
      handled = false
    } else if (arrows[key]) {
      const [x, y] = arrows[key]
      const step = big ? 10 : 1
      edit((l, s) => moveSprites(l, s, x * step, y * step))
    } else if (key === 'q' || key === 'e') {
      const step = big ? 15 : 1
      edit((l, s) => rotateSprites(l, s, key === 'q' ? -step : step))
    } else if (e.key === '+' || e.key === '=') {
      edit((l, s) => scaleSprites(l, s, 0.05))
    } else if (e.key === '-' || e.key === '_') {
      edit((l, s) => scaleSprites(l, s, -0.05))
    } else if (key === 'f') {
      flip()
    } else if (e.key === 'PageUp') {
      depth(1)
    } else if (e.key === 'PageDown') {
      depth(-1)
    } else if (e.key === '0') {
      resetSelected()
    } else {
      handled = false
    }
    // Buttons keep Space and Enter; everything handled here would otherwise scroll or type.
    if (handled) e.preventDefault()
  })

  useEffect(() => {
    const listener = (e: KeyboardEvent) => onKeyDown(e)
    window.addEventListener('keydown', listener)
    return () => window.removeEventListener('keydown', listener)
  }, [])

  return createPortal(
    <div
      ref={root}
      role="dialog"
      aria-modal="true"
      aria-labelledby="layout-editor-title"
      tabIndex={-1}
      className="fixed inset-0 z-50 flex flex-col bg-slate-950 text-slate-100 outline-none"
    >
      <header className="flex shrink-0 flex-wrap items-center gap-x-6 gap-y-2 border-b border-slate-800 px-5 py-3">
        <div className="flex min-w-0 items-baseline gap-3">
          <h2
            id="layout-editor-title"
            className="font-display text-xl font-bold tracking-wide whitespace-nowrap"
          >
            {t('scenes.layout.title')}
          </h2>
          <span className="font-display truncate text-base text-slate-400">{scene.name}</span>
        </div>
        <SaveIndicator status={saveStatus} />
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <div
            role="group"
            aria-label={t('scenes.layout.view')}
            className="flex items-center gap-1 rounded-lg bg-slate-900 p-1 ring-1 ring-slate-800"
          >
            <ToolbarToggle
              pressed={hud}
              onToggle={() => setHud(!hud)}
              label={t('scenes.layout.toggles.hud')}
              hint={t('scenes.layout.toggles.hudHint')}
            >
              <PanelBottom className="h-4 w-4" aria-hidden="true" />
            </ToolbarToggle>
            <ToolbarToggle
              pressed={grid}
              onToggle={() => setGrid(!grid)}
              label={t('scenes.layout.toggles.grid')}
              hint={t('scenes.layout.toggles.gridHint')}
            >
              <Grid3x3 className="h-4 w-4" aria-hidden="true" />
            </ToolbarToggle>
            <ToolbarToggle
              pressed={guides}
              onToggle={() => setGuides(!guides)}
              label={t('scenes.layout.toggles.guides')}
              hint={t('scenes.layout.toggles.guidesHint')}
            >
              <Magnet className="h-4 w-4" aria-hidden="true" />
            </ToolbarToggle>
          </div>
          <ResetAll disabled={!customized} onReset={() => onChange(resetLayout(scene.layout))} />
          <Button size="sm" variant="secondary" onClick={onClose}>
            <X className="h-4 w-4" aria-hidden="true" />
            {t('scenes.layout.close')}
          </Button>
        </div>
      </header>

      <div className="grid min-h-0 flex-1 grid-cols-[15rem_minmax(0,1fr)_19rem]">
        <aside className="min-h-0 overflow-y-auto border-r border-slate-800 p-4">
          {sprites.length === 0 ? (
            <p className="text-sm text-slate-400">{t('scenes.layout.empty')}</p>
          ) : (
            <EntityList sprites={sprites} selection={selectedKeys} onSelect={select} />
          )}
        </aside>

        <main
          aria-label={t('scenes.layout.stage')}
          className="relative min-h-0 min-w-0 bg-[#05060d] p-6"
        >
          <FitStage
            stage={
              <SceneEditingContext.Provider value={true}>
                <BattleScene battle={battle} hud={hud} />
              </SceneEditingContext.Provider>
            }
            renderOverlay={(zoom) => (
              <HandlesLayer
                sprites={sprites}
                selection={selectedKeys}
                primary={primary}
                scale={zoom}
                grid={grid}
                guides={activeGuides}
                dragging={live !== null}
                toolbar={
                  <QuickActions
                    flipped={selected.length > 0 && selected.every((s) => s.combatant.flipSprite)}
                    onFlip={flip}
                    onDepth={depth}
                    onReset={resetSelected}
                  />
                }
                onDragStart={dragStart}
                onDragMove={(e, at) => dragMove(e, at, zoom)}
                onDragEnd={dragEnd}
                onBackgroundPointerDown={() => setSelection([])}
              />
            )}
          />
        </main>

        <aside
          aria-label={t('scenes.layout.inspector.label')}
          className="min-h-0 overflow-y-auto border-l border-slate-800 p-4"
        >
          <Inspector
            selected={selected}
            onField={(field, value) => edit((l, s) => setSpriteField(l, s, field, value))}
            onFlip={flip}
            onDepth={depth}
            onReset={resetSelected}
            shortcuts={<Shortcuts />}
          />
        </aside>
      </div>
    </div>,
    document.body,
  )
}
