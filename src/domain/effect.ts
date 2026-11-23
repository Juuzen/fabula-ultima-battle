import { z } from 'zod'

/**
 * Visual effects that ship with the app, drawn in code by the Display. The GM can add
 * custom video effects too (see CustomEffect): both are named by an EffectRef.
 */
export const BUILTIN_EFFECTS = [
  'slash',
  'impact',
  'fire',
  'ice',
  'thunder',
  'light',
  'shadow',
] as const
export const EffectIdSchema = z.enum(BUILTIN_EFFECTS)
export type EffectId = z.infer<typeof EffectIdSchema>

export const CUSTOM_EFFECT_PREFIX = 'custom:'

/** The effect of an action: one of the built-in drawings or a custom video effect. */
export type EffectRef = EffectId | `${typeof CUSTOM_EFFECT_PREFIX}${string}`

export const EffectRefSchema = z.union([
  EffectIdSchema,
  z.custom<`${typeof CUSTOM_EFFECT_PREFIX}${string}`>(
    (v) => typeof v === 'string' && v.startsWith(CUSTOM_EFFECT_PREFIX) && v.length > 7,
  ),
])

export const customEffectRef = (id: string): EffectRef => `${CUSTOM_EFFECT_PREFIX}${id}`

/** Id of the custom effect an EffectRef points to; null for built-in effects. */
export function customEffectId(ref: EffectRef | null): string | null {
  return ref?.startsWith(CUSTOM_EFFECT_PREFIX) ? ref.slice(CUSTOM_EFFECT_PREFIX.length) : null
}

export const isBuiltinEffect = (ref: EffectRef): ref is EffectId =>
  (BUILTIN_EFFECTS as readonly string[]).includes(ref)
