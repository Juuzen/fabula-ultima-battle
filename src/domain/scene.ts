import { z } from 'zod'

import type { BattleState } from './battle'
import type { NewCombatant, Side } from './combatant'
import { DepthSchema, SpriteTransformSchema } from './placement'
import { combatantFromUnit, numberedNames, UnitIdSchema, type Unit, type UnitId } from './unit'

export const MAX_ENEMY_COPIES = 12

export const SceneEnemySchema = z.object({
  unitId: UnitIdSchema,
  count: z.int().min(1).max(MAX_ENEMY_COPIES),
})
export type SceneEnemy = z.infer<typeof SceneEnemySchema>

/** How one sprite of the scene is laid out. The defaults mean "as the automatic formation". */
export const SceneSpriteSchema = z.object({
  /** null = automatic formation slot. */
  transform: SpriteTransformSchema.nullable(),
  /** null = no manual depth layer. */
  depth: DepthSchema.nullable(),
  flip: z.boolean(),
})
export type SceneSprite = z.infer<typeof SceneSpriteSchema>

export const DEFAULT_SCENE_SPRITE: SceneSprite = { transform: null, depth: null, flip: false }

/**
 * Identifies one sprite of a scene across edits: `party:<unitId>`, or `enemy:<unitId>:<n>`
 * for the n-th copy of an enemy sheet (the same numbering the copies get on the field).
 */
export type LayoutKey = string

export const partyLayoutKey = (unitId: UnitId): LayoutKey => `party:${unitId}`
export const enemyLayoutKey = (unitId: UnitId, copy: number): LayoutKey => `enemy:${unitId}:${copy}`

/** Scene layout: only the sprites the GM touched are stored. */
export const SceneLayoutSchema = z.record(z.string().min(1), SceneSpriteSchema)
export type SceneLayout = z.infer<typeof SceneLayoutSchema>

/** A prepared encounter: who fights on both sides, plus name, background and music. */
export const BattleSceneSchema = z
  .object({
    id: z.string().min(1),
    name: z.string().trim().min(1).max(60),
    partyUnitIds: z.array(UnitIdSchema),
    enemies: z.array(SceneEnemySchema),
    /** Asset library references (phase 7); null = defaults. */
    backgroundAssetId: z.string().min(1).nullable(),
    musicAssetId: z.string().min(1).nullable(),
    /** Per-sprite layout (position, size, rotation, depth, mirroring). Older scenes have none. */
    layout: SceneLayoutSchema.default({}),
    updatedAt: z.number(),
  })
  .refine((s) => new Set(s.partyUnitIds).size === s.partyUnitIds.length, {
    message: 'a party member can join only once',
    path: ['partyUnitIds'],
  })
export type BattleScene = z.infer<typeof BattleSceneSchema>

/** One sprite a scene puts on the field, in deployment order: party first, then enemies. */
export type SceneSlotRef = { key: LayoutKey; unitId: UnitId; side: Side; copy: number }

/** Copies per enemy sheet, two rows of the same sheet counting as one. Insertion order. */
function enemyTotals(enemies: readonly SceneEnemy[]): Map<UnitId, number> {
  const totals = new Map<UnitId, number>()
  for (const { unitId, count } of enemies) totals.set(unitId, (totals.get(unitId) ?? 0) + count)
  return totals
}

/** Every sprite the scene deploys, with its layout key. */
export function sceneSlotRefs(
  scene: Pick<BattleScene, 'partyUnitIds' | 'enemies'>,
): SceneSlotRef[] {
  const refs: SceneSlotRef[] = scene.partyUnitIds.map((unitId) => ({
    key: partyLayoutKey(unitId),
    unitId,
    side: 'ally',
    copy: 1,
  }))
  for (const [unitId, count] of enemyTotals(scene.enemies)) {
    for (let copy = 1; copy <= count; copy++) {
      refs.push({ key: enemyLayoutKey(unitId, copy), unitId, side: 'enemy', copy })
    }
  }
  return refs
}

const isDefaultSprite = (s: SceneSprite) => s.transform === null && s.depth === null && !s.flip

/** Drops layout entries of sprites no longer in the scene, and entries equal to the default. */
export function pruneLayout(
  scene: Pick<BattleScene, 'partyUnitIds' | 'enemies' | 'layout'>,
): SceneLayout {
  const keys = new Set(sceneSlotRefs(scene).map((r) => r.key))
  return Object.fromEntries(
    Object.entries(scene.layout).filter(
      ([key, sprite]) => keys.has(key) && !isDefaultSprite(sprite),
    ),
  )
}

/** "Default layout": every sprite back to its automatic slot and depth. Mirroring stays. */
export function resetLayout(layout: SceneLayout, keys?: ReadonlySet<LayoutKey>): SceneLayout {
  const next: SceneLayout = {}
  for (const [key, sprite] of Object.entries(layout)) {
    if (keys && !keys.has(key)) next[key] = sprite
    else if (sprite.flip) next[key] = { ...DEFAULT_SCENE_SPRITE, flip: true }
  }
  return next
}

export type SceneCombatants = {
  combatants: NewCombatant[]
  /** Sheets the scene refers to that no longer exist. */
  missing: UnitId[]
}

/**
 * Expands a scene into the combatants it deploys: party first, then enemies numbered by sheet,
 * each with its layout (position, size, rotation, depth, mirroring). `newId` receives the
 * sprite's layout key, so a preview can use it as the combatant id.
 */
export function sceneCombatants(
  scene: Pick<BattleScene, 'partyUnitIds' | 'enemies'> & Partial<Pick<BattleScene, 'layout'>>,
  units: ReadonlyMap<UnitId, Unit>,
  newId: (key: LayoutKey) => string,
): SceneCombatants {
  const combatants: NewCombatant[] = []
  const missing: UnitId[] = []
  const layout = scene.layout ?? {}
  const withLayout = (c: NewCombatant, key: LayoutKey): NewCombatant => {
    const sprite = layout[key] ?? DEFAULT_SCENE_SPRITE
    return { ...c, placement: sprite.transform, depth: sprite.depth, flipSprite: sprite.flip }
  }

  for (const unitId of scene.partyUnitIds) {
    const unit = units.get(unitId)
    const key = partyLayoutKey(unitId)
    if (unit?.kind === 'party')
      combatants.push(withLayout(combatantFromUnit(unit, newId(key)), key))
    else missing.push(unitId)
  }

  // Total copies per sheet first, so two rows of the same enemy share one numbering.
  for (const [unitId, count] of enemyTotals(scene.enemies)) {
    const unit = units.get(unitId)
    if (unit?.kind !== 'enemy') {
      missing.push(unitId)
      continue
    }
    numberedNames(unit.name, count, []).forEach((name, i) => {
      const key = enemyLayoutKey(unitId, i + 1)
      combatants.push(withLayout(combatantFromUnit(unit, newId(key), name), key))
    })
  }

  return { combatants, missing }
}

export type PartyWriteBack = { unitId: UnitId; hp: number; mp: number }

/**
 * Party members that left the field between two states, with the PV/PM they had when they
 * left. Their sheets get these values back (statuses are not kept).
 */
export function partyLeavingField(before: BattleState, after: BattleState): PartyWriteBack[] {
  const remaining = new Set(after.combatants.map((c) => c.id))
  return before.combatants.flatMap((c) =>
    c.side === 'ally' && c.unitId && !remaining.has(c.id)
      ? [{ unitId: c.unitId, hp: c.hp, mp: c.mp }]
      : [],
  )
}
