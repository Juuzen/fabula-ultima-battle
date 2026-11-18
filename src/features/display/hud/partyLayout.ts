/** Horizontal room available to the slots, in stage px (stage width minus margins and padding). */
const PANEL_INNER_WIDTH = 1800
export const SLOT_GAP = 14
const MAX_SLOT_WIDTH = 320

/** Slot width so that `count` slots always fit on the stage, capped for small parties. */
export function partySlotWidth(count: number): number {
  if (count <= 0) return MAX_SLOT_WIDTH
  const fit = Math.floor((PANEL_INNER_WIDTH - (count - 1) * SLOT_GAP) / count)
  return Math.min(MAX_SLOT_WIDTH, fit)
}
