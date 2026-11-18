import type { BattleState } from './battle'
import type { CombatantId, Side } from './combatant'
import type { BattleEvent } from './events'

/**
 * What the players are allowed to see. During preparation the enemies are still
 * being set up, so they are removed entirely (not just hidden by CSS): the Display
 * never receives them. Pure, so the Master can use it for both the sync and its preview.
 */
export function projectForPlayers(battle: BattleState): BattleState {
  if (battle.phase === 'active') return battle
  return { ...battle, combatants: battle.combatants.filter((c) => c.side !== 'enemy') }
}

function subjectOf(event: BattleEvent): CombatantId | null {
  if ('id' in event) return event.id
  if (event.type === 'COMBATANT_ADDED' || event.type === 'COMBATANT_UPDATED') {
    return event.combatant.id
  }
  return null
}

/**
 * Drops events that would leak hidden enemies (e.g. damage dealt during preparation).
 * `previous` is needed to know the side of combatants removed by the command.
 */
export function projectEventsForPlayers(
  events: readonly BattleEvent[],
  previous: BattleState,
  next: BattleState,
): BattleEvent[] {
  if (next.phase === 'active') {
    return events.filter((e) => e.type !== 'BATTLE_LOADED') // carries the full state
  }
  const sides = new Map<CombatantId, Side>()
  for (const c of [...previous.combatants, ...next.combatants]) sides.set(c.id, c.side)

  return events.filter((event) => {
    if (event.type === 'BATTLE_LOADED') return false
    const subject = subjectOf(event)
    return subject === null || sides.get(subject) !== 'enemy'
  })
}
