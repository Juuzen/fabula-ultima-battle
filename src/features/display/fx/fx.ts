import type { BattleEvent, CombatantId, StatusId } from '@/domain'

/** A short-lived visual effect on one combatant (floating text, shake, glow…). */
export type FxKind = 'damage' | 'heal' | 'mpLoss' | 'mpGain' | 'crisis' | 'ko' | 'revive' | 'status'

export type Fx = {
  /** Unique and increasing: also tells components which hit is the latest. */
  id: number
  kind: FxKind
  targetId: CombatantId
  amount?: number
  /** For `status`: the status just applied. */
  status?: StatusId
}

/**
 * Turns domain events into visual effects. Pure: the Display decides how they look,
 * the domain only says what happened. Events with no visual counterpart are ignored.
 */
export function eventsToFx(events: readonly BattleEvent[], firstId: number): Fx[] {
  const fx: Fx[] = []
  let id = firstId
  const add = (kind: FxKind, targetId: CombatantId, amount?: number) =>
    fx.push(
      amount === undefined ? { id: id++, kind, targetId } : { id: id++, kind, targetId, amount },
    )

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
      case 'STATUS_CHANGED':
        // Only a newly applied status is announced; removing one is silent.
        if (event.active)
          fx.push({ id: id++, kind: 'status', targetId: event.id, status: event.status })
        break
      default:
        break
    }
  }
  return fx
}

/** Effects that make the sprite react (shake / flash / glow), as opposed to text only. */
export const HIT_KINDS: ReadonlySet<FxKind> = new Set(['damage', 'heal', 'revive'])
