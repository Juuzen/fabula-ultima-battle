import { Dexie, type Table } from 'dexie'

import type { AssetMeta, BattleScene, CustomEffect, Unit } from '@/domain'

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
  }
}
