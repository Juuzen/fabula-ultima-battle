import {
  customEffectId,
  isBuiltinEffect,
  type CustomEffect,
  type EffectId,
  type EffectRef,
} from '@/domain'

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

/**
 * Timing of any effect. A custom effect brings its own (its video's length and the impact
 * point the GM chose); one that no longer exists plays like no effect.
 */
export function timingOf(
  effect: EffectRef | null,
  customEffects: ReadonlyMap<string, CustomEffect> = new Map(),
): EffectTiming {
  if (!effect) return NO_EFFECT_TIMING
  if (isBuiltinEffect(effect)) return EFFECT_TIMING[effect]
  const custom = customEffects.get(customEffectId(effect) ?? '')
  return custom ? { durationMs: custom.durationMs, impactAt: custom.impactAt } : NO_EFFECT_TIMING
}

/**
 * Total length of a sequence (useful for tests and pacing). Without an actor (the GM acts)
 * nobody steps forward or back, so only the effect and the hold are left.
 */
export function sequenceLength(
  effect: EffectRef | null,
  withActor = true,
  customEffects?: ReadonlyMap<string, CustomEffect>,
): number {
  const { advance, cast, hold, retreat } = SEQUENCE
  const moves = withActor ? advance + cast + retreat : 0
  return moves + timingOf(effect, customEffects).durationMs + hold
}
