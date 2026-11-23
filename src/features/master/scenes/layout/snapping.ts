/** Default grid step, in stage px. */
export const GRID_STEP = 40

/** Lines the snap aligned to, in stage px, shown while dragging. */
export type Guides = { vertical: number[]; horizontal: number[] }

export const NO_GUIDES: Guides = { vertical: [], horizontal: [] }

export type SnapOptions = {
  /** Feet of the sprites that are not being dragged. */
  others: readonly { x: number; y: number }[]
  /** Extra vertical lines to align to (e.g. the centre of the stage). */
  lines?: readonly number[]
  guides: boolean
  /** Grid step in stage px, or null for no grid. */
  grid: number | null
  /** How close (in stage px) a position must be to a guide to snap to it. */
  threshold: number
}

function nearest(value: number, candidates: readonly number[], threshold: number): number | null {
  let best: number | null = null
  for (const c of candidates) {
    if (
      Math.abs(c - value) <= threshold &&
      (best === null || Math.abs(c - value) < Math.abs(best - value))
    ) {
      best = c
    }
  }
  return best
}

const toGrid = (value: number, step: number) => Math.round(value / step) * step

/**
 * Where a dragged sprite's feet land: on another sprite's feet line (same x or same y) when
 * close enough, otherwise on the grid. Each axis snaps on its own.
 */
export function snapPoint(
  point: { x: number; y: number },
  { others, lines = [], guides, grid, threshold }: SnapOptions,
): { x: number; y: number; guides: Guides } {
  const xGuide = guides ? nearest(point.x, [...others.map((o) => o.x), ...lines], threshold) : null
  const yGuide = guides
    ? nearest(
        point.y,
        others.map((o) => o.y),
        threshold,
      )
    : null
  const x = xGuide ?? (grid ? toGrid(point.x, grid) : point.x)
  const y = yGuide ?? (grid ? toGrid(point.y, grid) : point.y)
  return {
    x,
    y,
    guides: {
      vertical: xGuide === null ? [] : [xGuide],
      horizontal: yGuide === null ? [] : [yGuide],
    },
  }
}
