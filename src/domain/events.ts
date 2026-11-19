import type { ActionKind, EffectId } from './action'
import type { BattleState, Presentation } from './battle'
import type { Combatant, CombatantId } from './combatant'
import type { StatusId } from './status'

/**
 * Facts produced by a command. The Display turns them into choreography
 * (damage numbers, shakes, KO fades…); the Master can use them for a log.
 */
export type BattleEvent =
  | { type: 'COMBATANT_ADDED'; combatant: Combatant }
  | { type: 'COMBATANT_UPDATED'; combatant: Combatant }
  | { type: 'COMBATANT_REMOVED'; id: CombatantId }
  | { type: 'COMBATANT_MOVED'; id: CombatantId; toIndex: number }
  | { type: 'DAMAGED'; id: CombatantId; amount: number; hp: number }
  | { type: 'HEALED'; id: CombatantId; amount: number; hp: number }
  | { type: 'HP_SET'; id: CombatantId; hp: number }
  | { type: 'MP_SPENT'; id: CombatantId; amount: number; mp: number }
  | { type: 'MP_RESTORED'; id: CombatantId; amount: number; mp: number }
  | { type: 'MP_SET'; id: CombatantId; mp: number }
  | { type: 'CRISIS_ENTERED'; id: CombatantId }
  | { type: 'CRISIS_EXITED'; id: CombatantId }
  | { type: 'KNOCKED_OUT'; id: CombatantId }
  | { type: 'REVIVED'; id: CombatantId }
  | { type: 'STATUS_CHANGED'; id: CombatantId; status: StatusId; active: boolean }
  | { type: 'STATS_REVEAL_CHANGED'; id: CombatantId; reveal: boolean }
  | { type: 'PRESENTATION_CHANGED'; presentation: Presentation }
  | { type: 'BACKGROUND_CHANGED'; assetId: string | null }
  | { type: 'BATTLE_RENAMED'; name: string }
  | { type: 'BATTLE_LOADED'; state: BattleState }
  | { type: 'BATTLE_STARTED' }
  /**
   * Opens an action's sequence. The events that follow (MP spent, damage, statuses…) are its
   * outcome: the Display plays the choreography and applies them on impact.
   */
  | {
      type: 'ACTION_PERFORMED'
      actorId: CombatantId
      name: string
      effect: EffectId
      kind: ActionKind
      targetIds: CombatantId[]
    }
  | { type: 'BATTLE_ENDED'; removedEnemyIds: CombatantId[] }

export type BattleEventType = BattleEvent['type']
