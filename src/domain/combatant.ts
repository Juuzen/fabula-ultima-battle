import { z } from 'zod'

import { StatusIdSchema } from './status'

export const SIDES = ['ally', 'enemy'] as const
export const SideSchema = z.enum(SIDES)
export type Side = z.infer<typeof SideSchema>

export const CombatantIdSchema = z.string().min(1)
export type CombatantId = z.infer<typeof CombatantIdSchema>

const AssetRefSchema = z.string().min(1).nullable()

export const CombatantSchema = z
  .object({
    id: CombatantIdSchema,
    name: z.string().trim().min(1),
    side: SideSchema,
    maxHp: z.int().min(1),
    hp: z.int().min(0),
    /** Mind Points. `maxMp: 0` means the combatant has no MP gauge. */
    maxMp: z.int().min(0),
    mp: z.int().min(0),
    /** Visual-only markers, kept unique and in insertion order. */
    statuses: z.array(StatusIdSchema),
    /** Battlefield sprite (asset library, phase 7); null = placeholder. */
    spriteAssetId: AssetRefSchema,
    /** Portrait for the party panel; null = falls back to the sprite, then a placeholder. */
    portraitAssetId: AssetRefSchema,
    /** Mirror the sprite horizontally, for images drawn facing the "wrong" way. */
    flipSprite: z.boolean(),
    /** Enemies only: the GM revealed this foe's exact HP/MP to the players. */
    revealStats: z.boolean(),
  })
  .refine((c) => c.hp <= c.maxHp, { message: 'hp cannot exceed maxHp', path: ['hp'] })
  .refine((c) => c.mp <= c.maxMp, { message: 'mp cannot exceed maxMp', path: ['mp'] })
  .refine((c) => new Set(c.statuses).size === c.statuses.length, {
    message: 'statuses must be unique',
    path: ['statuses'],
  })

export type Combatant = z.infer<typeof CombatantSchema>

export type NewCombatant = Pick<Combatant, 'id' | 'name' | 'side' | 'maxHp'> &
  Partial<Omit<Combatant, 'id' | 'name' | 'side' | 'maxHp'>>

/** Builds a combatant with sensible defaults (full HP/MP, no statuses, no art, stats hidden). */
export function createCombatant(input: NewCombatant): Combatant {
  const maxMp = input.maxMp ?? 0
  return {
    hp: input.maxHp,
    maxMp,
    mp: maxMp,
    statuses: [],
    spriteAssetId: null,
    portraitAssetId: null,
    flipSprite: false,
    revealStats: false,
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

/** Clamps a resource value (HP or MP) to [0, max], dropping decimals. */
export function clampResource(value: number, max: number): number {
  return Math.min(Math.max(Math.trunc(value), 0), max)
}
