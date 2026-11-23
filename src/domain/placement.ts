import { z } from 'zod'

import type { Side } from './combatant'

/** Logical size of the battle stage, in px. Every placement is expressed in this space. */
export const FIELD_WIDTH = 1920
export const FIELD_HEIGHT = 1080

export const MIN_SPRITE_SCALE = 0.25
export const MAX_SPRITE_SCALE = 3
export const MIN_SPRITE_ROTATION = -180
export const MAX_SPRITE_ROTATION = 180

/** Manual depth layers: 0 = by position (lower feet in front); higher layers draw in front. */
export const MIN_DEPTH = -5
export const MAX_DEPTH = 5

/** Closest a sprite's feet may get to the left/right edge of the stage. */
export const FIELD_EDGE = 40
/** Highest the feet may go: room for a sprite at normal size above them. */
export const FIELD_TOP = 120

/**
 * Where a sprite stands and how it is drawn: feet anchor (bottom centre) in stage px,
 * size relative to the 200×220 sprite box, clockwise rotation in degrees around the feet.
 */
export const SpriteTransformSchema = z.object({
  x: z.number().min(0).max(FIELD_WIDTH),
  y: z.number().min(0).max(FIELD_HEIGHT),
  scale: z.number().min(MIN_SPRITE_SCALE).max(MAX_SPRITE_SCALE),
  rotation: z.number().min(MIN_SPRITE_ROTATION).max(MAX_SPRITE_ROTATION),
})
export type SpriteTransform = z.infer<typeof SpriteTransformSchema>

export const DepthSchema = z.int().min(MIN_DEPTH).max(MAX_DEPTH)

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max)

/** Horizontal room of a side: enemies keep to the left half of the stage, the party to the right. */
export function sideBounds(side: Side): { minX: number; maxX: number } {
  const centre = FIELD_WIDTH / 2
  return side === 'enemy'
    ? { minX: FIELD_EDGE, maxX: centre }
    : { minX: centre, maxX: FIELD_WIDTH - FIELD_EDGE }
}

/** Wraps an angle into [-180, 180]. */
export function normalizeRotation(degrees: number): number {
  const wrapped = ((((degrees + 180) % 360) + 360) % 360) - 180
  return wrapped === -180 && degrees > 0 ? 180 : wrapped
}

/** Keeps a transform inside its side's half of the stage and inside the allowed ranges. */
export function clampTransform(side: Side, t: SpriteTransform): SpriteTransform {
  const { minX, maxX } = sideBounds(side)
  return {
    x: Math.round(clamp(t.x, minX, maxX)),
    y: Math.round(clamp(t.y, FIELD_TOP, FIELD_HEIGHT)),
    scale: Math.round(clamp(t.scale, MIN_SPRITE_SCALE, MAX_SPRITE_SCALE) * 1000) / 1000,
    rotation: Math.round(normalizeRotation(t.rotation)),
  }
}

export const clampDepth = (depth: number) => clamp(Math.round(depth), MIN_DEPTH, MAX_DEPTH)
