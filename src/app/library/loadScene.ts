import { battleStore, type BattleStore } from '@/app/store'
import { sceneCombatants, type BattleScene } from '@/domain'

import { library as defaultLibrary, type Library } from './library'

export type LoadSceneResult = { ok: boolean; missing: number }

/**
 * Puts a prepared scene on the field: party members bring the PV/PM stored on their sheets,
 * enemies enter numbered and at full strength. One undo step; the battle stays in preparation.
 */
export async function loadSceneIntoBattle(
  scene: BattleScene,
  {
    library = defaultLibrary,
    store = battleStore,
  }: { library?: Library; store?: BattleStore } = {},
): Promise<LoadSceneResult> {
  const ids = [...scene.partyUnitIds, ...scene.enemies.map((e) => e.unitId)]
  const units = await library.getUnits(ids)
  const { combatants, missing } = sceneCombatants(scene, units, () => crypto.randomUUID())
  const result = store.getState().dispatch({
    type: 'LOAD_SCENE',
    name: scene.name,
    backgroundAssetId: scene.backgroundAssetId,
    combatants,
  })
  return { ok: result.ok, missing: missing.length }
}
