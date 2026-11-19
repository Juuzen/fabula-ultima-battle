import { z } from 'zod'

import { CombatantIdSchema } from './combatant'
import { StatusIdSchema } from './status'

/**
 * Visual effects that ship with the app. The Display draws them in code; from phase 7
 * each one can be replaced by a user-provided .webm video.
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

/** What the action does to each target. */
export const ACTION_KINDS = ['damage', 'heal', 'mpDamage'] as const
export const ActionKindSchema = z.enum(ACTION_KINDS)
export type ActionKind = z.infer<typeof ActionKindSchema>

export const ActionTargetSchema = z.object({
  id: CombatantIdSchema,
  /** HP lost (damage), HP restored (heal) or MP lost (mpDamage). */
  amount: z.int().min(0),
})
export type ActionTarget = z.infer<typeof ActionTargetSchema>

/**
 * A choreographed action: an actor uses something (attack, spell, skill…) on one or more
 * targets. The Display plays it as a sequence; the state changes all at once (one undo step).
 */
export const ActionSchema = z
  .object({
    actorId: CombatantIdSchema,
    /** Shown as a banner on the player screen (e.g. "Palla di fuoco"); empty = no banner. */
    name: z.string().trim().max(60),
    effect: EffectIdSchema,
    kind: ActionKindSchema,
    /** MP spent by the actor (e.g. a spell's cost). */
    mpCost: z.int().min(0),
    /** Statuses applied to every target on impact. */
    statuses: z.array(StatusIdSchema),
    targets: z.array(ActionTargetSchema).min(1),
  })
  .refine((a) => new Set(a.targets.map((t) => t.id)).size === a.targets.length, {
    message: 'targets must be unique',
    path: ['targets'],
  })
  .refine((a) => new Set(a.statuses).size === a.statuses.length, {
    message: 'statuses must be unique',
    path: ['statuses'],
  })

export type Action = z.infer<typeof ActionSchema>
