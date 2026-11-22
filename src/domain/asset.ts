import { z } from 'zod'

import { BUILTIN_EFFECTS, type EffectId } from './effect'

/** What a file is, decided by its MIME type when it is uploaded. */
export const ASSET_KINDS = ['image', 'video', 'audio'] as const
export const AssetKindSchema = z.enum(ASSET_KINDS)
export type AssetKind = z.infer<typeof AssetKindSchema>

/**
 * Which shelf of the library a file sits on. It decides where the file is offered:
 * sheet art (sprites and portraits), backgrounds, effect videos, music, sound effects.
 */
export const ASSET_ROLES = ['art', 'background', 'effect', 'music', 'sfx'] as const
export const AssetRoleSchema = z.enum(ASSET_ROLES)
export type AssetRole = z.infer<typeof AssetRoleSchema>

/** Kinds of file each shelf accepts. Backgrounds may be still images or looping videos. */
export const ROLE_KINDS: Record<AssetRole, readonly AssetKind[]> = {
  art: ['image'],
  background: ['image', 'video'],
  effect: ['video'],
  music: ['audio'],
  sfx: ['audio'],
}

export const AssetIdSchema = z.string().min(1)
export type AssetId = z.infer<typeof AssetIdSchema>

/** A file in the library. The bytes are stored separately; this is what lists and pickers read. */
export const AssetMetaSchema = z.object({
  id: AssetIdSchema,
  name: z.string().trim().min(1).max(120),
  kind: AssetKindSchema,
  role: AssetRoleSchema,
  mime: z.string().min(1),
  size: z.int().min(0),
  /** Pixel size of images and videos; null for audio or when unknown. */
  width: z.int().min(0).nullable(),
  height: z.int().min(0).nullable(),
  /** Length of videos and audio, in milliseconds; null for images or when unknown. */
  durationMs: z.int().min(0).nullable(),
  createdAt: z.number(),
})
export type AssetMeta = z.infer<typeof AssetMetaSchema>

/** Kind of a file from its MIME type; null when the app cannot use it. */
export function kindOfMime(mime: string): AssetKind | null {
  if (mime.startsWith('image/')) return 'image'
  if (mime.startsWith('video/')) return 'video'
  if (mime.startsWith('audio/')) return 'audio'
  return null
}

/** Whether a file of this kind can go on this shelf. */
export function fitsRole(kind: AssetKind, role: AssetRole): boolean {
  return ROLE_KINDS[role].includes(kind)
}

// ── Custom effects ───────────────────────────────────────────────────────────

export const MIN_EFFECT_SCALE = 0.25
export const MAX_EFFECT_SCALE = 3

/** A video effect made by the GM, e.g. "Fiamma nera": a .webm, when it hits, how big it is. */
export const CustomEffectSchema = z.object({
  id: z.string().min(1),
  name: z.string().trim().min(1).max(40),
  videoAssetId: AssetIdSchema,
  /** Length of the video, copied from the asset when it is chosen. */
  durationMs: z.int().min(100).max(20_000),
  /** When the hit lands, as a fraction of the video (bars and numbers update then). */
  impactAt: z.number().min(0.05).max(0.95),
  /** Size relative to the built-in effects' 400 px box. */
  scale: z.number().min(MIN_EFFECT_SCALE).max(MAX_EFFECT_SCALE),
  /** Sound played on impact; null = the defaults (see SoundSettings). */
  soundAssetId: AssetIdSchema.nullable(),
  updatedAt: z.number(),
})
export type CustomEffect = z.infer<typeof CustomEffectSchema>

// ── Sounds ───────────────────────────────────────────────────────────────────

export const SYSTEM_SOUNDS = ['hit', 'heal', 'ko', 'battleStart'] as const
export type SystemSound = (typeof SYSTEM_SOUNDS)[number]

/** Which sound plays when, stored once in the library and read by the Display. */
export const SoundSettingsSchema = z.object({
  /** Fallbacks when an action has no sound of its own: hit, heal, KO, start of battle. */
  system: z.object(
    Object.fromEntries(SYSTEM_SOUNDS.map((s) => [s, AssetIdSchema.nullable()])) as Record<
      SystemSound,
      z.ZodNullable<typeof AssetIdSchema>
    >,
  ),
  /** Sound of each built-in effect, played on impact. */
  effects: z.object(
    Object.fromEntries(BUILTIN_EFFECTS.map((e) => [e, AssetIdSchema.nullable()])) as Record<
      EffectId,
      z.ZodNullable<typeof AssetIdSchema>
    >,
  ),
})
export type SoundSettings = z.infer<typeof SoundSettingsSchema>

export function createDefaultSoundSettings(): SoundSettings {
  return {
    system: { hit: null, heal: null, ko: null, battleStart: null },
    effects: {
      slash: null,
      impact: null,
      fire: null,
      ice: null,
      thunder: null,
      light: null,
      shadow: null,
    },
  }
}
