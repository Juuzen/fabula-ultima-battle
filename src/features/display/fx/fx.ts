import type { BattleEvent, CombatantId } from '@/domain'

/** A short-lived visual effect on one combatant (floating text, shake, glow…). */
export type FxKind = 'damage' | 'heal' | 'mpLoss' | 'mpGain' | 'crisis' | 'ko' | 'revive'

export type Fx = {
  /** Unique and increasing: also tells components which hit is the latest. */
  id: number
  kind: FxKind
  targetId: CombatantId
  amount?: number
  /**
   * Vertical slot among the texts on the same target (0 = lowest). Fixed when the effect
   * is queued, so a text never jumps when the one below it finishes.
   */
  stack: number
}

/** Smallest slot not used by the target's active effects. */
function freeSlot(active: readonly Fx[], targetId: CombatantId): number {
  const used = new Set(active.filter((f) => f.targetId === targetId).map((f) => f.stack))
  let slot = 0
  while (used.has(slot)) slot++
  return slot
}

/**
 * Turns domain events into visual effects. Pure: the Display decides how they look,
 * the domain only says what happened. Events with no visual counterpart are ignored.
 */
export function eventsToFx(
  events: readonly BattleEvent[],
  firstId: number,
  active: readonly Fx[] = [],
): Fx[] {
  const fx: Fx[] = []
  let id = firstId
  const add = (kind: FxKind, targetId: CombatantId, amount?: number) => {
    const stack = freeSlot([...active, ...fx], targetId)
    fx.push(
      amount === undefined
        ? { id: id++, kind, targetId, stack }
        : { id: id++, kind, targetId, amount, stack },
    )
  }

  for (const event of events) {
    switch (event.type) {
      case 'DAMAGED':
        add('damage', event.id, event.amount)
        break
      case 'HEALED':
        add('heal', event.id, event.amount)
        break
      case 'MP_SPENT':
        if (event.amount > 0) add('mpLoss', event.id, event.amount)
        break
      case 'MP_RESTORED':
        if (event.amount > 0) add('mpGain', event.id, event.amount)
        break
      case 'CRISIS_ENTERED':
        add('crisis', event.id)
        break
      case 'KNOCKED_OUT':
        add('ko', event.id)
        break
      case 'REVIVED':
        add('revive', event.id)
        break
      default:
        break
    }
  }
  return fx
}

/** Effects that make the sprite react (shake / flash / glow), as opposed to text only. */
export const HIT_KINDS: ReadonlySet<FxKind> = new Set(['damage', 'heal', 'revive'])
