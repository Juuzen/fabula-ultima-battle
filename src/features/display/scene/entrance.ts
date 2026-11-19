/**
 * Timing of combatants' entrance, in seconds. The first one waits for the screen fade
 * (see PlayerScreen); the others follow one by one, like monsters popping in a JRPG.
 */
export const ENTRANCE_BASE_DELAY = 0.35
export const ENTRANCE_STAGGER = 0.12

export function entranceDelay(index: number): number {
  return ENTRANCE_BASE_DELAY + index * ENTRANCE_STAGGER
}
