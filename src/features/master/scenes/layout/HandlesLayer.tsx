import { useRef, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import type { LayoutKey } from '@/domain'
import { SPRITE_BOX, STAGE_WIDTH, type Slot } from '@/features/display'

import type { LayoutSprite } from './previewBattle'
import { GRID_STEP, type Guides } from './snapping'

export type DragTarget = { kind: 'move'; sprite: LayoutSprite } | { kind: 'scale' | 'rotate' }

export type StagePoint = { x: number; y: number }

/** The sprite's box on screen: feet at the bottom centre, turned around them. */
function boxStyle(slot: Slot, k: number) {
  const width = SPRITE_BOX.width * slot.scale * k
  const height = SPRITE_BOX.height * slot.scale * k
  return {
    left: slot.x * k - width / 2,
    top: slot.y * k - height,
    width,
    height,
    transform: `rotate(${slot.rotation}deg)`,
    transformOrigin: '50% 100%',
  }
}

/** Room above the box for the rotate knob (40px above the head, 16px tall). */
const KNOB_CLEARANCE = 48
const TOOLBAR_GAP = 8
const TOOLBAR_HEIGHT = 42

type Props = {
  sprites: readonly LayoutSprite[]
  selection: ReadonlySet<LayoutKey>
  primary: LayoutSprite | null
  /** Stage px → screen px. */
  scale: number
  grid: boolean
  guides: Guides
  dragging: boolean
  toolbar: ReactNode
  onDragStart: (e: ReactPointerEvent<HTMLElement>, target: DragTarget, at: StagePoint) => void
  onDragMove: (e: ReactPointerEvent<HTMLElement>, at: StagePoint) => void
  onDragEnd: () => void
  onBackgroundPointerDown: () => void
}

/**
 * Editing controls over the stage, in screen pixels so they keep their size at any zoom:
 * a hit box per sprite (topmost first), the selection outline, scale and rotate handles
 * on the main selected sprite, snap guides, the grid and the line between the two halves.
 */
export function HandlesLayer({
  sprites,
  selection,
  primary,
  scale: k,
  grid,
  guides,
  dragging,
  toolbar,
  onDragStart,
  onDragMove,
  onDragEnd,
  onBackgroundPointerDown,
}: Props) {
  const { t } = useTranslation()
  const root = useRef<HTMLDivElement>(null)

  const toStage = (e: ReactPointerEvent): StagePoint => {
    const rect = root.current!.getBoundingClientRect()
    return { x: (e.clientX - rect.left) / k, y: (e.clientY - rect.top) / k }
  }
  const start = (target: DragTarget) => (e: ReactPointerEvent<HTMLElement>) => {
    if (e.button !== 0) return
    e.stopPropagation()
    root.current?.setPointerCapture(e.pointerId)
    onDragStart(e, target, toStage(e))
  }

  const byDepth = [...sprites].sort((a, b) => a.slot.zIndex - b.slot.zIndex)
  // The quick actions float above the rotate knob, or below the feet when there is no room.
  const boxTop = primary ? (primary.slot.y - SPRITE_BOX.height * primary.slot.scale) * k : 0
  const toolbarAbove = boxTop - KNOB_CLEARANCE - TOOLBAR_GAP - TOOLBAR_HEIGHT

  return (
    <div
      ref={root}
      data-testid="layout-handles"
      className="absolute inset-0 touch-none select-none"
      onPointerDown={(e) => {
        if (e.button === 0) onBackgroundPointerDown()
      }}
      onPointerMove={(e) => onDragMove(e, toStage(e))}
      onPointerUp={onDragEnd}
      onPointerCancel={onDragEnd}
    >
      {grid && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage:
              'linear-gradient(to right, rgba(255,255,255,.12) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,.12) 1px, transparent 1px)',
            backgroundSize: `${GRID_STEP * k}px ${GRID_STEP * k}px`,
          }}
        />
      )}

      {/* The two halves: enemies left, party right. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 border-l border-dashed border-white/25"
        style={{ left: (STAGE_WIDTH / 2) * k }}
      />

      {byDepth.map((sprite) => (
        <div
          key={sprite.key}
          aria-hidden="true"
          data-testid={`layout-hit-${sprite.key}`}
          className={`absolute cursor-move rounded-sm ${
            selection.has(sprite.key)
              ? 'outline-2 outline-indigo-400'
              : 'hover:outline-1 hover:outline-white/50'
          }`}
          style={boxStyle(sprite.slot, k)}
          onPointerDown={start({ kind: 'move', sprite })}
        />
      ))}

      {guides.vertical.map((x) => (
        <div
          key={`v${x}`}
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 w-px bg-indigo-300"
          style={{ left: x * k }}
        />
      ))}
      {guides.horizontal.map((y) => (
        <div
          key={`h${y}`}
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 h-px bg-indigo-300"
          style={{ top: y * k }}
        />
      ))}

      {primary && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute"
          style={{ ...boxStyle(primary.slot, k), zIndex: 1 }}
        >
          {/* Rotate: a knob on a short stem above the head. */}
          <div className="absolute -top-7 left-1/2 h-7 w-px -translate-x-1/2 bg-indigo-400" />
          <div
            title={t('scenes.layout.handles.rotate')}
            data-testid="layout-rotate"
            className="pointer-events-auto absolute -top-10 left-1/2 h-4 w-4 -translate-x-1/2 cursor-grab rounded-full border-2 border-indigo-400 bg-white active:cursor-grabbing"
            onPointerDown={start({ kind: 'rotate' })}
          />
          {/* Scale: the top-right corner. */}
          <div
            title={t('scenes.layout.handles.scale')}
            data-testid="layout-scale"
            className="pointer-events-auto absolute -top-2 -right-2 h-4 w-4 cursor-nesw-resize rounded-[3px] border-2 border-indigo-400 bg-white"
            onPointerDown={start({ kind: 'scale' })}
          />
          {/* Feet: the anchor everything turns and grows around. */}
          <div className="absolute -bottom-1 left-1/2 h-2 w-2 -translate-x-1/2 rounded-full bg-indigo-400 ring-2 ring-white" />
        </div>
      )}

      {primary && !dragging && (
        <div
          className="absolute flex -translate-x-1/2 items-center gap-0.5 rounded-lg border border-slate-700 bg-slate-900/95 p-1 shadow-[0_8px_24px_rgba(0,0,0,.5)]"
          style={{
            left: Math.min(Math.max(primary.slot.x * k, 96), STAGE_WIDTH * k - 96),
            top: toolbarAbove >= 4 ? toolbarAbove : primary.slot.y * k + TOOLBAR_GAP + 8,
            zIndex: 2,
          }}
          onPointerDown={(e) => e.stopPropagation()}
        >
          {toolbar}
        </div>
      )}
    </div>
  )
}
