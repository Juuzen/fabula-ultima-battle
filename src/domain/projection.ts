import type { BattleState } from './battle'
import type { CombatantId } from './combatant'
import type { BattleEvent } from './events'

/**
 * What the players are allowed to see. During preparation they only get the waiting
 * screen, so no combatant is sent at all (enemies being set up stay secret, not just
 * hidden by CSS). Pure, so the Master can use it for both the sync and its preview.
 */
export function projectForPlayers(battle: BattleState): BattleState {
  if (battle.phase === 'active') return battle
  return { ...battle, combatants: [] }
}

function subjectOf(event: BattleEvent): CombatantId | null {
  if ('id' in event) return event.id
  if (event.type === 'COMBATANT_ADDED' || event.type === 'COMBATANT_UPDATED') {
    return event.combatant.id
  }
  return null
}

/**
 * Drops events about combatants the players cannot see (all of them while preparing, and
 * with them any action sequence: the waiting screen has nobody to play it). Battle-level
 * events (start, end, presentation…) always go through; the full-state load event never does.
 */
export function projectEventsForPlayers(
  events: readonly BattleEvent[],
  next: BattleState,
): BattleEvent[] {
  return events.filter((event) => {
    if (event.type === 'BATTLE_LOADED') return false
    if (next.phase === 'active') return true
    return event.type !== 'ACTION_PERFORMED' && subjectOf(event) === null
  })
}
