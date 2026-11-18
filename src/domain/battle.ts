import { z } from 'zod'

import { CombatantSchema, type Combatant, type CombatantId, type Side } from './combatant'

export const BattleStateSchema = z
  .object({
    name: z.string(),
    /** Reference to an asset in the local asset library (phase 7); null = default backdrop. */
    backgroundAssetId: z.string().min(1).nullable(),
    /** Display order: array order within each side. */
    combatants: z.array(CombatantSchema),
  })
  .refine((b) => new Set(b.combatants.map((c) => c.id)).size === b.combatants.length, {
    message: 'combatant ids must be unique',
    path: ['combatants'],
  })

export type BattleState = z.infer<typeof BattleStateSchema>

export function createEmptyBattle(name = ''): BattleState {
  return { name, backgroundAssetId: null, combatants: [] }
}

export function findCombatant(state: BattleState, id: CombatantId): Combatant | undefined {
  return state.combatants.find((c) => c.id === id)
}

export function combatantsOnSide(state: BattleState, side: Side): Combatant[] {
  return state.combatants.filter((c) => c.side === side)
}
