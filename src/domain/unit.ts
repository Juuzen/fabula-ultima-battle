import { z } from 'zod'

import { ActionKindSchema, EffectIdSchema } from './action'
import type { NewCombatant } from './combatant'
import { StatusIdSchema } from './status'

/** Which library a sheet belongs to. Party sheets keep their current PV/PM between battles. */
export const UNIT_KINDS = ['party', 'enemy'] as const
export const UnitKindSchema = z.enum(UNIT_KINDS)
export type UnitKind = z.infer<typeof UnitKindSchema>

export const UnitIdSchema = z.string().min(1)
export type UnitId = z.infer<typeof UnitIdSchema>

const uniqueStatuses = z
  .array(StatusIdSchema)
  .refine((s) => new Set(s).size === s.length, { message: 'statuses must be unique' })

/**
 * A saved ability. Name, effect, kind and statuses prefill the action panel. MP cost and
 * amount are only reminders: the GM always types the real numbers (they depend on the roll).
 */
export const AbilitySchema = z.object({
  id: z.string().min(1),
  name: z.string().trim().min(1).max(60),
  effect: EffectIdSchema,
  kind: ActionKindSchema,
  statuses: uniqueStatuses,
  mpCostHint: z.int().min(0).nullable(),
  amountHint: z.int().min(0).nullable(),
})
export type Ability = z.infer<typeof AbilitySchema>

const AssetRefSchema = z.string().min(1).nullable()

/** A character or enemy sheet in the preparation libraries. */
export const UnitSchema = z
  .object({
    id: UnitIdSchema,
    kind: UnitKindSchema,
    name: z.string().trim().min(1).max(60),
    maxHp: z.int().min(1),
    maxMp: z.int().min(0),
    /** Party: current PV/PM, written back when the character leaves the field. Enemies: = max. */
    hp: z.int().min(0),
    mp: z.int().min(0),
    spriteAssetId: AssetRefSchema,
    portraitAssetId: AssetRefSchema,
    flipSprite: z.boolean(),
    /** Free category, e.g. "Bestia", "Elite", "Boss". Empty = none. */
    tag: z.string().trim().max(30),
    /** GM-only notes: weaknesses, tactics, rule reminders. */
    notes: z.string().max(2000),
    abilities: z.array(AbilitySchema),
    updatedAt: z.number(),
  })
  .refine((u) => u.hp <= u.maxHp, { message: 'hp cannot exceed maxHp', path: ['hp'] })
  .refine((u) => u.mp <= u.maxMp, { message: 'mp cannot exceed maxMp', path: ['mp'] })
  .refine((u) => new Set(u.abilities.map((a) => a.id)).size === u.abilities.length, {
    message: 'ability ids must be unique',
    path: ['abilities'],
  })
export type Unit = z.infer<typeof UnitSchema>

export type NewUnit = Pick<Unit, 'id' | 'kind' | 'name' | 'maxHp'> &
  Partial<Omit<Unit, 'id' | 'kind' | 'name' | 'maxHp'>>

/** Builds a sheet with sensible defaults: full PV/PM, no art, no abilities. */
export function createUnit(input: NewUnit): Unit {
  const maxMp = input.maxMp ?? 0
  return {
    hp: input.maxHp,
    maxMp,
    mp: maxMp,
    spriteAssetId: null,
    portraitAssetId: null,
    flipSprite: false,
    tag: '',
    notes: '',
    abilities: [],
    updatedAt: 0,
    ...input,
  }
}

/**
 * The combatant a sheet puts on the field. Party members bring their current PV/PM;
 * enemies always enter at full strength.
 */
export function combatantFromUnit(unit: Unit, id: string, name = unit.name): NewCombatant {
  const party = unit.kind === 'party'
  return {
    id,
    name,
    side: party ? 'ally' : 'enemy',
    unitId: unit.id,
    maxHp: unit.maxHp,
    hp: party ? Math.min(unit.hp, unit.maxHp) : unit.maxHp,
    maxMp: unit.maxMp,
    mp: party ? Math.min(unit.mp, unit.maxMp) : unit.maxMp,
    spriteAssetId: unit.spriteAssetId,
    portraitAssetId: unit.portraitAssetId,
    flipSprite: unit.flipSprite,
  }
}

const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/**
 * Names for `count` new copies of an enemy, continuing the numbering already on the field:
 * "Goblin" ×3 → Goblin 1, 2, 3; one more later → Goblin 4. A lone copy keeps the plain name.
 */
export function numberedNames(base: string, count: number, existing: readonly string[]): string[] {
  const pattern = new RegExp(`^${escapeRegExp(base)}(?: (\\d+))?$`)
  let highest = 0
  for (const name of existing) {
    const match = pattern.exec(name)
    if (match) highest = Math.max(highest, match[1] ? Number(match[1]) : 1)
  }
  if (count === 1 && highest === 0) return [base]
  return Array.from({ length: count }, (_, i) => `${base} ${highest + i + 1}`)
}
