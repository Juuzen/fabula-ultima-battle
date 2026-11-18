import type { Side } from '@/domain'

import { STAGE_WIDTH } from '../stage/stageScale'

/** A combatant's anchor on the stage: bottom-centre of the sprite ("feet"), in stage px. */
export type Slot = { x: number; y: number; scale: number; zIndex: number }

/** Tunables of the battlefield, in logical stage pixels (1920×1080). */
export const FIELD = {
  /** Vertical band where feet can be placed (the HUD sits below). */
  top: 390,
  bottom: 770,
  /** Distance of the front column from the stage centre. */
  frontOffset: 230,
  columnGap: 320,
  /** Horizontal shift per row, for the classic JRPG diagonal. */
  stagger: 95,
  maxPerColumn: 4,
  /** Closest a sprite's anchor may get to the stage edge (half a sprite plus margin). */
  edgeMargin: 130,
  /** Rows lower on screen are "closer" and drawn slightly bigger. */
  minScale: 0.9,
  maxScale: 1.05,
} as const

/**
 * Computes the slots of one side, front column first. Enemies stand on the left,
 * the party on the right (mirrored). Pure: the same input always yields the same layout.
 */
export function formationSlots(count: number, side: Side): Slot[] {
  if (count <= 0) return []
  const columns = Math.ceil(count / FIELD.maxPerColumn)
  const perColumn = Math.ceil(count / columns)
  const centre = STAGE_WIDTH / 2
  const direction = side === 'enemy' ? -1 : 1

  // Large groups would overflow the stage: compress column gap and stagger to fit.
  const spread = (columns - 1) * FIELD.columnGap + (perColumn - 1) * FIELD.stagger
  const room = centre - FIELD.edgeMargin - FIELD.frontOffset
  const squeeze = spread > room ? room / spread : 1

  return Array.from({ length: count }, (_, i) => {
    const column = Math.floor(i / perColumn)
    const row = i % perColumn
    const rowsInColumn = Math.min(perColumn, count - column * perColumn)

    // Spread rows evenly; odd (back) columns shift a quarter step so sprites peek between rows.
    const step = (FIELD.bottom - FIELD.top) / rowsInColumn
    const offset = column % 2 === 1 ? step / 4 : 0
    const y = Math.round(FIELD.top + step * (row + 0.5) + offset)

    const distance = FIELD.frontOffset + (column * FIELD.columnGap + row * FIELD.stagger) * squeeze
    const x = Math.round(centre + direction * distance)

    const depth = (y - FIELD.top) / (FIELD.bottom - FIELD.top)
    const scale = FIELD.minScale + (FIELD.maxScale - FIELD.minScale) * depth

    return { x, y, scale: Math.round(scale * 1000) / 1000, zIndex: y }
  })
}
