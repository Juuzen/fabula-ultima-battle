import type { z } from 'zod'

import {
  AssetMetaSchema,
  BattleSceneSchema,
  createDefaultSoundSettings,
  customEffectRef,
  CustomEffectSchema,
  fitsRole,
  kindOfMime,
  pruneLayout,
  SoundSettingsSchema,
  UnitSchema,
  type AssetId,
  type AssetMeta,
  type AssetRole,
  type BattleScene,
  type CustomEffect,
  type SoundSettings,
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

function validRows<T>(rows: unknown[], schema: z.ZodType<T>, what: string): T[] {
  return rows.flatMap((row) => {
    const parsed = schema.safeParse(row)
    if (parsed.success) return [parsed.data]
    console.warn(`Ignoring invalid ${what}`, parsed.error)
    return []
  })
}

const SOUNDS_KEY = 'sounds'

/** A file the GM is adding, with what the browser could read of it (see probeMedia). */
export type NewAsset = {
  name: string
  blob: Blob
  role: AssetRole
  width?: number | null
  height?: number | null
  durationMs?: number | null
}

/** unsupported: not an image, video or audio file. wrongShelf: e.g. a song as a sprite. */
export type AssetRejection = 'unsupported' | 'wrongShelf'

export class AssetRejectedError extends Error {
  readonly reason: AssetRejection
  constructor(reason: AssetRejection) {
    super(`Asset rejected: ${reason}`)
    this.reason = reason
  }
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
            const layout = pruneLayout({ partyUnitIds, enemies, layout: scene.layout ?? {} })
            await db.scenes.put({ ...scene, partyUnitIds, enemies, layout, updatedAt: now() })
          }
        }
      })
    },

    async listScenes(): Promise<BattleScene[]> {
      return validScenes(await db.scenes.toArray()).sort(byName)
    },

    async saveScene(scene: BattleScene): Promise<BattleScene> {
      const parsed = BattleSceneSchema.parse({ ...scene, updatedAt: now() })
      parsed.layout = pruneLayout(parsed)
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

    // ── Files ──────────────────────────────────────────────────────────────

    /** Stores a file on a shelf. The kind comes from its MIME type and must suit the shelf. */
    async addAsset(input: NewAsset): Promise<AssetMeta> {
      const kind = kindOfMime(input.blob.type)
      if (!kind) throw new AssetRejectedError('unsupported')
      if (!fitsRole(kind, input.role)) throw new AssetRejectedError('wrongShelf')
      const meta = AssetMetaSchema.parse({
        id: crypto.randomUUID(),
        name: input.name.trim().slice(0, 120) || '—',
        kind,
        role: input.role,
        mime: input.blob.type,
        size: input.blob.size,
        width: input.width ?? null,
        height: input.height ?? null,
        durationMs: input.durationMs ?? null,
        createdAt: now(),
      })
      const data = await input.blob.arrayBuffer()
      await db.transaction('rw', db.assets, db.assetBlobs, async () => {
        await db.assetBlobs.put({ id: meta.id, data, mime: meta.mime })
        await db.assets.put(meta)
      })
      return meta
    },

    /** Newest first: what was just uploaded is on top. */
    async listAssets(role?: AssetRole): Promise<AssetMeta[]> {
      const rows = role
        ? await db.assets.where('role').equals(role).toArray()
        : await db.assets.toArray()
      return validRows(rows, AssetMetaSchema, 'asset').sort((a, b) => b.createdAt - a.createdAt)
    },

    async getAsset(id: AssetId): Promise<AssetMeta | undefined> {
      const row = await db.assets.get(id)
      return row ? validRows([row], AssetMetaSchema, 'asset')[0] : undefined
    },

    async getAssetBlob(id: AssetId): Promise<Blob | undefined> {
      const row = await db.assetBlobs.get(id)
      return row ? new Blob([row.data], { type: row.mime }) : undefined
    },

    async renameAsset(id: AssetId, name: string): Promise<void> {
      const trimmed = name.trim().slice(0, 120)
      if (trimmed) await db.assets.update(id, { name: trimmed })
    },

    /** How many sheets, scenes, effects and sound slots use a file (to warn before deleting). */
    async assetUsage(id: AssetId): Promise<number> {
      const [units, scenes, effects, sounds] = await Promise.all([
        db.units.toArray(),
        db.scenes.toArray(),
        db.effects.toArray(),
        this.getSoundSettings(),
      ])
      const inUnits = units.reduce(
        (n, u) =>
          n +
          Number(u.spriteAssetId === id || u.portraitAssetId === id) +
          u.abilities.filter((a) => a.soundAssetId === id).length,
        0,
      )
      const inScenes = scenes.filter(
        (s) => s.backgroundAssetId === id || s.musicAssetId === id,
      ).length
      const inEffects = effects.filter((e) => e.videoAssetId === id || e.soundAssetId === id).length
      const inSounds = [...Object.values(sounds.system), ...Object.values(sounds.effects)].filter(
        (v) => v === id,
      ).length
      return inUnits + inScenes + inEffects + inSounds
    },

    /**
     * Deletes a file and every reference to it: sheets and scenes lose that art or track,
     * sound slots go back to none, custom effects made of that video are deleted too.
     */
    async deleteAsset(id: AssetId): Promise<void> {
      const doomed = (await db.effects.toArray()).filter((e) => e.videoAssetId === id)
      for (const effect of doomed) await this.deleteEffect(effect.id)
      await db.transaction(
        'rw',
        [db.assets, db.assetBlobs, db.units, db.scenes, db.effects, db.settings],
        async () => {
          await db.assets.delete(id)
          await db.assetBlobs.delete(id)
          const clear = (v: string | null) => (v === id ? null : v)
          for (const u of await db.units.toArray()) {
            const next = {
              ...u,
              spriteAssetId: clear(u.spriteAssetId),
              portraitAssetId: clear(u.portraitAssetId),
              abilities: u.abilities.map((a) => ({
                ...a,
                soundAssetId: clear(a.soundAssetId ?? null),
              })),
            }
            if (JSON.stringify(next) !== JSON.stringify(u))
              await db.units.put({ ...next, updatedAt: now() })
          }
          for (const s of await db.scenes.toArray()) {
            if (s.backgroundAssetId === id || s.musicAssetId === id) {
              await db.scenes.put({
                ...s,
                backgroundAssetId: clear(s.backgroundAssetId),
                musicAssetId: clear(s.musicAssetId),
                updatedAt: now(),
              })
            }
          }
          for (const e of await db.effects.toArray()) {
            if (e.soundAssetId === id)
              await db.effects.put({ ...e, soundAssetId: null, updatedAt: now() })
          }
          const sounds = await this.getSoundSettings()
          const unset = <K extends string>(r: Record<K, string | null>) =>
            Object.fromEntries(
              Object.entries(r).map(([k, v]) => [k, v === id ? null : v]),
            ) as Record<K, string | null>
          await db.settings.put({
            key: SOUNDS_KEY,
            value: { system: unset(sounds.system), effects: unset(sounds.effects) },
          })
        },
      )
    },

    // ── Custom effects ─────────────────────────────────────────────────────

    async listEffects(): Promise<CustomEffect[]> {
      return validRows(await db.effects.toArray(), CustomEffectSchema, 'custom effect').sort(byName)
    },

    async saveEffect(effect: CustomEffect): Promise<CustomEffect> {
      const parsed = CustomEffectSchema.parse({ ...effect, updatedAt: now() })
      await db.effects.put(parsed)
      return parsed
    },

    /** Deletes a custom effect; abilities that used it go back to no effect. */
    async deleteEffect(id: string): Promise<void> {
      const ref = customEffectRef(id)
      await db.transaction('rw', db.effects, db.units, async () => {
        await db.effects.delete(id)
        for (const u of await db.units.toArray()) {
          if (u.abilities.some((a) => a.effect === ref)) {
            await db.units.put({
              ...u,
              abilities: u.abilities.map((a) => (a.effect === ref ? { ...a, effect: null } : a)),
              updatedAt: now(),
            })
          }
        }
      })
    },

    // ── Sounds ─────────────────────────────────────────────────────────────

    async getSoundSettings(): Promise<SoundSettings> {
      const row = await db.settings.get(SOUNDS_KEY)
      if (!row) return createDefaultSoundSettings()
      // Missing slots (e.g. an effect added later) fall back to none.
      const defaults = createDefaultSoundSettings()
      const value = row.value as Partial<SoundSettings> | undefined
      const parsed = SoundSettingsSchema.safeParse({
        system: { ...defaults.system, ...value?.system },
        effects: { ...defaults.effects, ...value?.effects },
      })
      return parsed.success ? parsed.data : defaults
    },

    async saveSoundSettings(settings: SoundSettings): Promise<void> {
      await db.settings.put({ key: SOUNDS_KEY, value: SoundSettingsSchema.parse(settings) })
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
