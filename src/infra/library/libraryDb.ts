import { Dexie, type Table } from 'dexie'

import {
  enemyLayoutKey,
  partyLayoutKey,
  type AssetMeta,
  type BattleScene,
  type CustomEffect,
  type SceneSprite,
  type Unit,
} from '@/domain'

export const LIBRARY_DB_NAME = 'fu-battle-library'

/**
 * The bytes of an asset, kept apart from its metadata so lists never load them. Stored as an
 * ArrayBuffer rather than a Blob: every browser (and the test database) clones it reliably.
 */
export type AssetBlobRow = { id: string; data: ArrayBuffer; mime: string }

/** Library-wide settings, one row per key (e.g. 'sounds'). */
export type SettingRow = { key: string; value: unknown }

/**
 * Preparation libraries in IndexedDB: unit sheets (party and bestiary), battle scenes, and
 * (since v2) the GM's files, custom effects and sound settings. Rows are validated with Zod
 * when read (see app/library), so a bad row never reaches the UI. The Display reads the same
 * database (same origin), so files never travel through the sync channel.
 */
export class LibraryDb extends Dexie {
  units!: Table<Unit, string>
  scenes!: Table<BattleScene, string>
  assets!: Table<AssetMeta, string>
  assetBlobs!: Table<AssetBlobRow, string>
  effects!: Table<CustomEffect, string>
  settings!: Table<SettingRow, string>

  constructor(name = LIBRARY_DB_NAME) {
    super(name)
    this.version(1).stores({
      units: 'id, kind, name',
      scenes: 'id, name',
    })
    this.version(2).stores({
      assets: 'id, role, kind, name',
      assetBlobs: 'id',
      effects: 'id, name',
      settings: 'key',
    })
    // v3: mirroring moves from the sheet to each sprite of a scene's layout.
    this.version(3).upgrade(async (tx) => {
      const flipped = new Map<string, 'party' | 'enemy'>()
      await tx
        .table('units')
        .toCollection()
        .modify((unit: Record<string, unknown>) => {
          if (unit.flipSprite === true)
            flipped.set(unit.id as string, unit.kind as 'party' | 'enemy')
          delete unit.flipSprite
        })
      await tx
        .table('scenes')
        .toCollection()
        .modify((scene: Record<string, unknown>) => {
          scene.layout = flippedLayout(scene, flipped)
        })
    })
  }
}

type LegacyScene = { partyUnitIds?: unknown; enemies?: unknown; layout?: unknown }

/** The layout a pre-v3 scene gets: every sprite of a mirrored sheet stays mirrored. */
export function flippedLayout(
  scene: LegacyScene,
  flipped: ReadonlyMap<string, 'party' | 'enemy'>,
): Record<string, SceneSprite> {
  const layout: Record<string, SceneSprite> = {
    ...(scene.layout as Record<string, SceneSprite> | undefined),
  }
  const sprite: SceneSprite = { transform: null, depth: null, flip: true }
  const party = Array.isArray(scene.partyUnitIds) ? (scene.partyUnitIds as string[]) : []
  for (const unitId of party) {
    if (flipped.get(unitId) === 'party') layout[partyLayoutKey(unitId)] = sprite
  }
  const totals = new Map<string, number>()
  const enemies = Array.isArray(scene.enemies)
    ? (scene.enemies as { unitId: string; count: number }[])
    : []
  for (const { unitId, count } of enemies) totals.set(unitId, (totals.get(unitId) ?? 0) + count)
  for (const [unitId, count] of totals) {
    if (flipped.get(unitId) !== 'enemy') continue
    for (let copy = 1; copy <= count; copy++) layout[enemyLayoutKey(unitId, copy)] = sprite
  }
  return layout
}
