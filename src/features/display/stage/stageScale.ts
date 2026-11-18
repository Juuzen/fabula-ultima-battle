/** Logical resolution of the battle stage. All Display coordinates are expressed in this space. */
export const STAGE_WIDTH = 1920
export const STAGE_HEIGHT = 1080

/**
 * Uniform scale that fits the logical stage inside the viewport (letterboxing the rest).
 * Pure function so it can be unit-tested without a DOM.
 */
export function computeStageScale(viewportWidth: number, viewportHeight: number): number {
  if (viewportWidth <= 0 || viewportHeight <= 0) return 0
  return Math.min(viewportWidth / STAGE_WIDTH, viewportHeight / STAGE_HEIGHT)
}
