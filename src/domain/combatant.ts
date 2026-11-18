import { z } from 'zod'

import { StatusIdSchema } from './status'

export const SIDES = ['ally', 'enemy'] as const
export const SideSchema = z.enum(SIDES)
export type Side = z.infer<typeof SideSchema>

export const CombatantIdSchema = z.string().min(1)
export type CombatantId = z.infer<typeof CombatantIdSchema>

export const CombatantSchema = z
  .object({
    id: CombatantIdSchema,
    name: z.string().trim().min(1),
    side: SideSchema,
    maxHp: z.int().min(1),
    hp: z.int().min(0),
    /** Visual-only markers, kept unique and in insertion order. */
    statuses: z.array(StatusIdSchema),
    /** Reference to an asset in the local asset library (phase 7); null = placeholder. */
    spriteAssetId: z.string().min(1).nullable(),
    /** Mirror the sprite horizontally, for images drawn facing the "wrong" way. */
    flipSprite: z.boolean(),
  })
  .refine((c) => c.hp <= c.maxHp, { message: 'hp cannot exceed maxHp', path: ['hp'] })
  .refine((c) => new Set(c.statuses).size === c.statuses.length, {
    message: 'statuses must be unique',
    path: ['statuses'],
  })

export type Combatant = z.infer<typeof CombatantSchema>

export type NewCombatant = Pick<Combatant, 'id' | 'name' | 'side' | 'maxHp'> &
  Partial<Pick<Combatant, 'hp' | 'statuses' | 'spriteAssetId' | 'flipSprite'>>

/** Builds a combatant with sensible defaults (full HP, no statuses, no sprite). */
export function createCombatant(input: NewCombatant): Combatant {
  return {
    hp: input.maxHp,
    statuses: [],
    spriteAssetId: null,
    flipSprite: false,
    ...input,
  }
}

/**
 * Crisis threshold: Fabula Ultima puts a creature in Crisis when its HP is
 * equal to or lower than half its maximum (rounded down).
 */
export function crisisThreshold(maxHp: number): number {
  return Math.floor(maxHp / 2)
}

export function isKnockedOut(c: Pick<Combatant, 'hp'>): boolean {
  return c.hp === 0
}

/** A knocked-out creature (0 HP) is not considered in Crisis. */
export function isInCrisis(c: Pick<Combatant, 'hp' | 'maxHp'>): boolean {
  return c.hp > 0 && c.hp <= crisisThreshold(c.maxHp)
}

export function clampHp(hp: number, maxHp: number): number {
  return Math.min(Math.max(Math.trunc(hp), 0), maxHp)
}
