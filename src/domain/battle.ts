import { z } from 'zod'

import { CombatantSchema, type Combatant, type CombatantId, type Side } from './combatant'

export const ENEMY_PANEL_MODES = ['manual', 'auto'] as const
export const MIN_AUTO_HIDE_SECONDS = 1
export const MAX_AUTO_HIDE_SECONDS = 120

/** How the Display shows the enemy info window. */
export const EnemyPanelSchema = z.object({
  /** manual: shown while `visible`; auto: pops up on enemy changes, hides after a delay. */
  mode: z.enum(ENEMY_PANEL_MODES),
  visible: z.boolean(),
  autoHideSeconds: z.int().min(MIN_AUTO_HIDE_SECONDS).max(MAX_AUTO_HIDE_SECONDS),
})
export type EnemyPanel = z.infer<typeof EnemyPanelSchema>

/** GM choices about what the players get to see. Authoritative, so it lives in the state. */
export const PresentationSchema = z.object({
  enemyPanel: EnemyPanelSchema,
  /** Shortcut: reveal HP/MP of every enemy, regardless of each one's flag. */
  revealAllEnemyStats: z.boolean(),
})
export type Presentation = z.infer<typeof PresentationSchema>

export const BattleStateSchema = z
  .object({
    name: z.string(),
    /** Reference to an asset in the local asset library (phase 7); null = default backdrop. */
    backgroundAssetId: z.string().min(1).nullable(),
    /** Display order: array order within each side. */
    combatants: z.array(CombatantSchema),
    presentation: PresentationSchema,
  })
  .refine((b) => new Set(b.combatants.map((c) => c.id)).size === b.combatants.length, {
    message: 'combatant ids must be unique',
    path: ['combatants'],
  })

export type BattleState = z.infer<typeof BattleStateSchema>

export function createDefaultPresentation(): Presentation {
  return {
    enemyPanel: { mode: 'auto', visible: false, autoHideSeconds: 6 },
    revealAllEnemyStats: false,
  }
}

export function createEmptyBattle(name = ''): BattleState {
  return {
    name,
    backgroundAssetId: null,
    combatants: [],
    presentation: createDefaultPresentation(),
  }
}

export function findCombatant(state: BattleState, id: CombatantId): Combatant | undefined {
  return state.combatants.find((c) => c.id === id)
}

export function combatantsOnSide(state: BattleState, side: Side): Combatant[] {
  return state.combatants.filter((c) => c.side === side)
}

/** Whether the players may see this combatant's exact HP/MP. Allies are always visible. */
export function areStatsRevealed(
  presentation: Pick<Presentation, 'revealAllEnemyStats'>,
  c: Pick<Combatant, 'side' | 'revealStats'>,
): boolean {
  return c.side === 'ally' || presentation.revealAllEnemyStats || c.revealStats
}
