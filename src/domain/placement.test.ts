import { describe, expect, it } from 'vitest'

import {
  clampDepth,
  clampTransform,
  FIELD_EDGE,
  FIELD_TOP,
  FIELD_WIDTH,
  MAX_DEPTH,
  MAX_SPRITE_SCALE,
  MIN_SPRITE_SCALE,
  normalizeRotation,
  sideBounds,
} from './placement'
import {
  BattleSceneSchema,
  enemyLayoutKey,
  partyLayoutKey,
  pruneLayout,
  resetLayout,
  sceneCombatants,
  sceneSlotRefs,
  type SceneLayout,
} from './scene'
import { createUnit, type Unit } from './unit'

const at = (x: number, y = 600, scale = 1, rotation = 0) => ({ x, y, scale, rotation })

describe('sprite placement', () => {
  it('keeps enemies in the left half and the party in the right half', () => {
    expect(sideBounds('enemy')).toEqual({ minX: FIELD_EDGE, maxX: FIELD_WIDTH / 2 })
    expect(sideBounds('ally')).toEqual({ minX: FIELD_WIDTH / 2, maxX: FIELD_WIDTH - FIELD_EDGE })
    expect(clampTransform('enemy', at(1500)).x).toBe(960)
    expect(clampTransform('enemy', at(-20)).x).toBe(FIELD_EDGE)
    expect(clampTransform('ally', at(300)).x).toBe(960)
    expect(clampTransform('ally', at(5000)).x).toBe(FIELD_WIDTH - FIELD_EDGE)
  })

  it('clamps height, size and rotation', () => {
    expect(clampTransform('enemy', at(400, 0)).y).toBe(FIELD_TOP)
    expect(clampTransform('enemy', at(400, 2000)).y).toBe(1080)
    expect(clampTransform('enemy', at(400, 600, 0.01)).scale).toBe(MIN_SPRITE_SCALE)
    expect(clampTransform('enemy', at(400, 600, 9)).scale).toBe(MAX_SPRITE_SCALE)
    expect(clampTransform('enemy', at(400, 600, 1, 200)).rotation).toBe(-160)
    expect(clampDepth(12)).toBe(MAX_DEPTH)
  })

  it('wraps angles into [-180, 180]', () => {
    expect(normalizeRotation(0)).toBe(0)
    expect(normalizeRotation(190)).toBe(-170)
    expect(normalizeRotation(-190)).toBe(170)
    expect(normalizeRotation(180)).toBe(180)
    expect(normalizeRotation(-180)).toBe(-180)
    expect(normalizeRotation(720 + 45)).toBe(45)
  })
})

const lyra = createUnit({ id: 'lyra', kind: 'party', name: 'Lyra', maxHp: 40 })
const goblin = createUnit({ id: 'gob', kind: 'enemy', name: 'Goblin', maxHp: 20 })
const units = new Map<string, Unit>([
  [lyra.id, lyra],
  [goblin.id, goblin],
])

describe('scene layout', () => {
  const base = {
    partyUnitIds: ['lyra'],
    enemies: [
      { unitId: 'gob', count: 2 },
      { unitId: 'gob', count: 1 },
    ],
  }

  it('gives every sprite a stable key, numbering copies across rows', () => {
    expect(sceneSlotRefs(base).map((r) => r.key)).toEqual([
      'party:lyra',
      'enemy:gob:1',
      'enemy:gob:2',
      'enemy:gob:3',
    ])
  })

  it('applies the layout to the combatants it deploys', () => {
    const layout: SceneLayout = {
      [enemyLayoutKey('gob', 2)]: { transform: at(300, 500, 1.5, -10), depth: 2, flip: true },
      [partyLayoutKey('lyra')]: { transform: null, depth: null, flip: true },
    }
    const { combatants } = sceneCombatants({ ...base, layout }, units, (key) => key)
    expect(combatants.map((c) => c.id)).toEqual([
      'party:lyra',
      'enemy:gob:1',
      'enemy:gob:2',
      'enemy:gob:3',
    ])
    expect(combatants[0]).toMatchObject({ placement: null, depth: null, flipSprite: true })
    expect(combatants[1]).toMatchObject({ placement: null, depth: null, flipSprite: false })
    expect(combatants[2]).toMatchObject({
      name: 'Goblin 2',
      placement: at(300, 500, 1.5, -10),
      depth: 2,
      flipSprite: true,
    })
  })

  it('drops entries of removed copies and entries equal to the default', () => {
    const layout: SceneLayout = {
      'enemy:gob:3': { transform: at(300), depth: null, flip: false },
      'enemy:gob:1': { transform: null, depth: null, flip: false },
      'party:lyra': { transform: null, depth: 1, flip: false },
      'party:gone': { transform: null, depth: null, flip: true },
    }
    const fewer = { partyUnitIds: ['lyra'], enemies: [{ unitId: 'gob', count: 2 }], layout }
    expect(pruneLayout(fewer)).toEqual({ 'party:lyra': layout['party:lyra'] })
  })

  it('resets position, size, rotation and depth, keeping the mirroring', () => {
    const layout: SceneLayout = {
      'enemy:gob:1': { transform: at(300), depth: 3, flip: true },
      'enemy:gob:2': { transform: at(200), depth: null, flip: false },
      'party:lyra': { transform: at(1500), depth: null, flip: false },
    }
    expect(resetLayout(layout)).toEqual({
      'enemy:gob:1': { transform: null, depth: null, flip: true },
    })
    expect(resetLayout(layout, new Set(['enemy:gob:2']))).toEqual({
      'enemy:gob:1': layout['enemy:gob:1'],
      'party:lyra': layout['party:lyra'],
    })
  })

  it('reads older scenes without a layout', () => {
    const parsed = BattleSceneSchema.parse({
      id: 's',
      name: 'Bosco',
      partyUnitIds: [],
      enemies: [],
      backgroundAssetId: null,
      musicAssetId: null,
      updatedAt: 0,
    })
    expect(parsed.layout).toEqual({})
  })
})
