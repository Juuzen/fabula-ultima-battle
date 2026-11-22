import { Dexie, type Table } from 'dexie'

import type { BattleScene, Unit } from '@/domain'

export const LIBRARY_DB_NAME = 'fu-battle-library'

/**
 * Preparation libraries in IndexedDB: unit sheets (party and bestiary) and battle scenes.
 * Rows are validated with Zod when read (see app/library), so a bad row never reaches the UI.
 */
export class LibraryDb extends Dexie {
  units!: Table<Unit, string>
  scenes!: Table<BattleScene, string>

  constructor(name = LIBRARY_DB_NAME) {
    super(name)
    this.version(1).stores({
      units: 'id, kind, name',
      scenes: 'id, name',
    })
  }
}
