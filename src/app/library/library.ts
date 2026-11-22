import {
  BattleSceneSchema,
  UnitSchema,
  type BattleScene,
  type PartyWriteBack,
  type Unit,
  type UnitId,
  type UnitKind,
} from '@/domain'
import { LibraryDb } from '@/infra/library/libraryDb'

function validUnits(rows: unknown[]): Unit[] {
  return rows.flatMap((row) => {
    const parsed = UnitSchema.safeParse(row)
    if (parsed.success) return [parsed.data]
    console.warn('Ignoring invalid unit sheet', parsed.error)
    return []
  })
}

function validScenes(rows: unknown[]): BattleScene[] {
  return rows.flatMap((row) => {
    const parsed = BattleSceneSchema.safeParse(row)
    if (parsed.success) return [parsed.data]
    console.warn('Ignoring invalid battle scene', parsed.error)
    return []
  })
}

const byName = <T extends { name: string }>(a: T, b: T) => a.name.localeCompare(b.name)

export type Library = ReturnType<typeof createLibrary>

/** Reads and writes the preparation libraries. Everything written is validated first. */
export function createLibrary(db: LibraryDb = new LibraryDb(), now: () => number = Date.now) {
  return {
    db,

    async listUnits(kind: UnitKind): Promise<Unit[]> {
      return validUnits(await db.units.where('kind').equals(kind).toArray()).sort(byName)
    },

    async getUnits(ids: readonly UnitId[]): Promise<Map<UnitId, Unit>> {
      const rows = await db.units.bulkGet([...ids])
      return new Map(validUnits(rows.filter(Boolean)).map((u) => [u.id, u]))
    },

    async saveUnit(unit: Unit): Promise<Unit> {
      const parsed = UnitSchema.parse({ ...unit, updatedAt: now() })
      await db.units.put(parsed)
      return parsed
    },

    /** Deletes a sheet and drops it from every scene that used it. */
    async deleteUnit(id: UnitId): Promise<void> {
      await db.transaction('rw', db.units, db.scenes, async () => {
        await db.units.delete(id)
        const scenes = await db.scenes.toArray()
        for (const scene of scenes) {
          const partyUnitIds = scene.partyUnitIds.filter((u) => u !== id)
          const enemies = scene.enemies.filter((e) => e.unitId !== id)
          if (
            partyUnitIds.length !== scene.partyUnitIds.length ||
            enemies.length !== scene.enemies.length
          ) {
            await db.scenes.put({ ...scene, partyUnitIds, enemies, updatedAt: now() })
          }
        }
      })
    },

    async listScenes(): Promise<BattleScene[]> {
      return validScenes(await db.scenes.toArray()).sort(byName)
    },

    async saveScene(scene: BattleScene): Promise<BattleScene> {
      const parsed = BattleSceneSchema.parse({ ...scene, updatedAt: now() })
      await db.scenes.put(parsed)
      return parsed
    },

    async deleteScene(id: string): Promise<void> {
      await db.scenes.delete(id)
    },

    /** Party members left the field: their sheets keep the PV/PM they had. */
    async writeBackParty(updates: readonly PartyWriteBack[]): Promise<void> {
      if (updates.length === 0) return
      await db.transaction('rw', db.units, async () => {
        for (const { unitId, hp, mp } of updates) {
          const unit = await db.units.get(unitId)
          if (!unit || unit.kind !== 'party') continue
          await db.units.put({
            ...unit,
            hp: Math.min(Math.max(hp, 0), unit.maxHp),
            mp: Math.min(Math.max(mp, 0), unit.maxMp),
            updatedAt: now(),
          })
        }
      })
    },

    /** "Riposo": every party sheet back to full PV and PM. */
    async restParty(): Promise<void> {
      await db.transaction('rw', db.units, async () => {
        const party = await db.units.where('kind').equals('party').toArray()
        await db.units.bulkPut(
          party.map((u) => ({ ...u, hp: u.maxHp, mp: u.maxMp, updatedAt: now() })),
        )
      })
    },
  }
}

/** The Master's library. Only the Master window reads or writes it. */
export const library = createLibrary()
