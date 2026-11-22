import type { EffectId } from '@/domain'

/** Durations of an action's sequence, in milliseconds. */
export const SEQUENCE = {
  /** Actor steps towards the centre of the field. */
  advance: 280,
  /** Short wind-up before the effect (cast / anticipation). */
  cast: 240,
  /** After the effect ends, before the actor steps back. */
  hold: 380,
  /** Actor goes back to its place. */
  retreat: 280,
} as const

/** Timing of a visual effect: total length, and when the hit lands (0–1 of the length). */
export type EffectTiming = { durationMs: number; impactAt: number }

export const EFFECT_TIMING: Record<EffectId, EffectTiming> = {
  slash: { durationMs: 650, impactAt: 0.45 },
  impact: { durationMs: 600, impactAt: 0.35 },
  fire: { durationMs: 1000, impactAt: 0.5 },
  ice: { durationMs: 1000, impactAt: 0.55 },
  thunder: { durationMs: 800, impactAt: 0.35 },
  light: { durationMs: 1100, impactAt: 0.55 },
  shadow: { durationMs: 1000, impactAt: 0.55 },
}

/** An action without a visual effect: just the hit, a beat after the wind-up. */
export const NO_EFFECT_TIMING: EffectTiming = { durationMs: 300, impactAt: 0.5 }

export const timingOf = (effect: EffectId | null): EffectTiming =>
  effect ? EFFECT_TIMING[effect] : NO_EFFECT_TIMING

/**
 * Total length of a sequence (useful for tests and pacing). Without an actor (the GM acts)
 * nobody steps forward or back, so only the effect and the hold are left.
 */
export function sequenceLength(effect: EffectId | null, withActor = true): number {
  const { advance, cast, hold, retreat } = SEQUENCE
  const moves = withActor ? advance + cast + retreat : 0
  return moves + timingOf(effect).durationMs + hold
}
