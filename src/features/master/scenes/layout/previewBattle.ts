import {
  combatantsOnSide,
  createCombatant,
  createDefaultPresentation,
  createEmptyBattle,
  sceneCombatants,
  type BattleScene,
  type BattleState,
  type Combatant,
  type LayoutKey,
  type Side,
  type SpriteTransform,
  type Unit,
  type UnitId,
} from '@/domain'
import { resolveSlots, type Slot } from '@/features/display'

export type PreviewScene = Pick<
  BattleScene,
  'name' | 'partyUnitIds' | 'enemies' | 'backgroundAssetId' | 'layout'
>

/**
 * The battle the scene would put on screen, as the players would see it once it starts.
 * Combatant ids are the layout keys, so every sprite maps straight back to its layout entry.
 */
export function previewBattle(scene: PreviewScene, units: ReadonlyMap<UnitId, Unit>): BattleState {
  const { combatants } = sceneCombatants(scene, units, (key) => key)
  const presentation = createDefaultPresentation()
  return {
    ...createEmptyBattle(scene.name),
    phase: 'active',
    backgroundAssetId: scene.backgroundAssetId,
    combatants: combatants.map(createCombatant),
    // The enemy window stays up, so its overlap with the sprites is visible.
    presentation: {
      ...presentation,
      enemyPanel: { ...presentation.enemyPanel, mode: 'manual', visible: true },
    },
  }
}

/** A sprite of the preview with where it currently stands. */
export type LayoutSprite = { key: LayoutKey; side: Side; combatant: Combatant; slot: Slot }

/** Every sprite with its resolved slot (layout or automatic formation), in deployment order. */
export function layoutSprites(battle: BattleState): LayoutSprite[] {
  return (['enemy', 'ally'] as const).flatMap((side) => {
    const combatants = combatantsOnSide(battle, side)
    const slots = resolveSlots(combatants, side)
    return combatants.map((combatant, i) => ({
      key: combatant.id,
      side,
      combatant,
      slot: slots[i]!,
    }))
  })
}

export const transformOf = ({ x, y, scale, rotation }: Slot): SpriteTransform => ({
  x,
  y,
  scale,
  rotation,
})
