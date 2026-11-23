import {
  clampDepth,
  clampTransform,
  DEFAULT_SCENE_SPRITE,
  type LayoutKey,
  type SceneLayout,
  type SceneSprite,
  type SpriteTransform,
} from '@/domain'

import { transformOf, type LayoutSprite } from './previewBattle'

/** Changes some sprites' entries; an untouched sprite starts from the default entry. */
function updateSprites(
  layout: SceneLayout,
  sprites: readonly LayoutSprite[],
  change: (entry: SceneSprite, sprite: LayoutSprite) => SceneSprite,
): SceneLayout {
  const next = { ...layout }
  for (const sprite of sprites) {
    next[sprite.key] = change(layout[sprite.key] ?? DEFAULT_SCENE_SPRITE, sprite)
  }
  return next
}

/**
 * Applies a geometric change to the selected sprites, starting from where each one stands now
 * (an automatic slot becomes an explicit position). Each sprite stays in its half of the stage.
 */
export function transformSprites(
  layout: SceneLayout,
  sprites: readonly LayoutSprite[],
  change: (t: SpriteTransform, sprite: LayoutSprite) => SpriteTransform,
): SceneLayout {
  return updateSprites(layout, sprites, (entry, sprite) => ({
    ...entry,
    transform: clampTransform(sprite.side, change(transformOf(sprite.slot), sprite)),
  }))
}

export const moveSprites = (
  layout: SceneLayout,
  sprites: readonly LayoutSprite[],
  dx: number,
  dy: number,
) => transformSprites(layout, sprites, (t) => ({ ...t, x: t.x + dx, y: t.y + dy }))

/** Each sprite grows or shrinks around its own feet. `delta` is added to the scale. */
export const scaleSprites = (
  layout: SceneLayout,
  sprites: readonly LayoutSprite[],
  delta: number,
) => transformSprites(layout, sprites, (t) => ({ ...t, scale: t.scale + delta }))

export const rotateSprites = (
  layout: SceneLayout,
  sprites: readonly LayoutSprite[],
  degrees: number,
) => transformSprites(layout, sprites, (t) => ({ ...t, rotation: t.rotation + degrees }))

/** Sets one field of the selected sprites to the same value (the inspector's inputs). */
export const setSpriteField = (
  layout: SceneLayout,
  sprites: readonly LayoutSprite[],
  field: keyof SpriteTransform,
  value: number,
) => transformSprites(layout, sprites, (t) => ({ ...t, [field]: value }))

/** Mirrors the selection: all mirrored if any was not, otherwise none. */
export function toggleFlip(layout: SceneLayout, sprites: readonly LayoutSprite[]): SceneLayout {
  const flip = !sprites.every((s) => s.combatant.flipSprite)
  return updateSprites(layout, sprites, (entry) => ({ ...entry, flip }))
}

/** Moves the selection one depth layer forward (+1) or back (−1). Layer 0 = by position. */
export function shiftDepth(
  layout: SceneLayout,
  sprites: readonly LayoutSprite[],
  step: number,
): SceneLayout {
  return updateSprites(layout, sprites, (entry) => {
    const depth = clampDepth((entry.depth ?? 0) + step)
    return { ...entry, depth: depth === 0 ? null : depth }
  })
}

/** The value all sprites share, or null when they differ (shown as "mixed"). */
export function sharedValue<T>(values: readonly T[]): T | null {
  if (values.length === 0) return null
  return values.every((v) => v === values[0]) ? values[0]! : null
}

export const keysOf = (sprites: readonly LayoutSprite[]) =>
  new Set<LayoutKey>(sprites.map((s) => s.key))
