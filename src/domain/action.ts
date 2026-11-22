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

/** What an action does to a target's PV or PM. */
export const ACTION_KINDS = ['damage', 'heal', 'mpDamage', 'mpRestore'] as const
export const ActionKindSchema = z.enum(ACTION_KINDS)
export type ActionKind = z.infer<typeof ActionKindSchema>

const uniqueStatuses = z
  .array(StatusIdSchema)
  .refine((s) => new Set(s).size === s.length, { message: 'statuses must be unique' })

export const ActionTargetSchema = z
  .object({
    id: CombatantIdSchema,
    /** PV or PM change; null = statuses only. */
    change: z.object({ kind: ActionKindSchema, amount: z.int().min(0) }).nullable(),
    /** Statuses applied on impact. */
    addStatuses: uniqueStatuses,
    /** Statuses cleared on impact. */
    removeStatuses: uniqueStatuses,
  })
  .refine((t) => t.change !== null || t.addStatuses.length + t.removeStatuses.length > 0, {
    message: 'a target needs at least one effect',
  })
  .refine((t) => !t.addStatuses.some((s) => t.removeStatuses.includes(s)), {
    message: 'a status cannot be both added and removed',
  })
export type ActionTarget = z.infer<typeof ActionTargetSchema>

/**
 * An action on one or more targets, each with its own outcome. With an actor it is a
 * choreographed move (attack, spell, skill…); without one it is the GM's own doing (a trap,
 * a potion, a quick fix). The Display plays it as a sequence; the state changes all at once.
 */
export const ActionSchema = z
  .object({
    /** Who acts; null = the GM. */
    actorId: CombatantIdSchema.nullable(),
    /** Shown as a banner on the player screen (e.g. "Palla di fuoco"); empty = no banner. */
    name: z.string().trim().max(60),
    /** Visual effect on the targets; null = none. */
    effect: EffectIdSchema.nullable(),
    /** MP spent by the actor (e.g. a spell's cost). Always 0 without an actor. */
    mpCost: z.int().min(0),
    targets: z.array(ActionTargetSchema).min(1),
  })
  .refine((a) => new Set(a.targets.map((t) => t.id)).size === a.targets.length, {
    message: 'targets must be unique',
    path: ['targets'],
  })
  .refine((a) => a.actorId !== null || a.mpCost === 0, {
    message: 'only an actor can spend MP',
    path: ['mpCost'],
  })

export type Action = z.infer<typeof ActionSchema>
