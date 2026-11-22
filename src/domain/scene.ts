import { z } from 'zod'

import type { BattleState } from './battle'
import type { NewCombatant } from './combatant'
import { combatantFromUnit, numberedNames, UnitIdSchema, type Unit, type UnitId } from './unit'

export const MAX_ENEMY_COPIES = 12

export const SceneEnemySchema = z.object({
  unitId: UnitIdSchema,
  count: z.int().min(1).max(MAX_ENEMY_COPIES),
})
export type SceneEnemy = z.infer<typeof SceneEnemySchema>

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
    updatedAt: z.number(),
  })
  .refine((s) => new Set(s.partyUnitIds).size === s.partyUnitIds.length, {
    message: 'a party member can join only once',
    path: ['partyUnitIds'],
  })
export type BattleScene = z.infer<typeof BattleSceneSchema>

export type SceneCombatants = {
  combatants: NewCombatant[]
  /** Sheets the scene refers to that no longer exist. */
  missing: UnitId[]
}

/** Expands a scene into the combatants it deploys: party first, then enemies numbered by sheet. */
export function sceneCombatants(
  scene: Pick<BattleScene, 'partyUnitIds' | 'enemies'>,
  units: ReadonlyMap<UnitId, Unit>,
  newId: () => string,
): SceneCombatants {
  const combatants: NewCombatant[] = []
  const missing: UnitId[] = []

  for (const unitId of scene.partyUnitIds) {
    const unit = units.get(unitId)
    if (unit?.kind === 'party') combatants.push(combatantFromUnit(unit, newId()))
    else missing.push(unitId)
  }

  // Total copies per sheet first, so two rows of the same enemy share one numbering.
  const totals = new Map<UnitId, number>()
  for (const { unitId, count } of scene.enemies) {
    totals.set(unitId, (totals.get(unitId) ?? 0) + count)
  }
  for (const [unitId, count] of totals) {
    const unit = units.get(unitId)
    if (unit?.kind !== 'enemy') {
      missing.push(unitId)
      continue
    }
    for (const name of numberedNames(unit.name, count, [])) {
      combatants.push(combatantFromUnit(unit, newId(), name))
    }
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
