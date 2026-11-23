import { describe, expect, it } from 'vitest'

import { createUnit, type SceneLayout, type Unit } from '@/domain'
import { resolveSlots } from '@/features/display'

import {
  moveSprites,
  rotateSprites,
  scaleSprites,
  setSpriteField,
  sharedValue,
  shiftDepth,
  toggleFlip,
} from './layoutModel'
import { layoutSprites, previewBattle, type PreviewScene } from './previewBattle'
import { snapPoint } from './snapping'

const lyra = createUnit({ id: 'lyra', kind: 'party', name: 'Lyra', maxHp: 40 })
const goblin = createUnit({ id: 'gob', kind: 'enemy', name: 'Goblin', maxHp: 20 })
const units = new Map<string, Unit>([
  [lyra.id, lyra],
  [goblin.id, goblin],
])

const scene = (layout: SceneLayout = {}): PreviewScene => ({
  name: 'Bosco',
  partyUnitIds: ['lyra'],
  enemies: [{ unitId: 'gob', count: 2 }],
  backgroundAssetId: null,
  layout,
})

const spritesOf = (layout: SceneLayout = {}) => layoutSprites(previewBattle(scene(layout), units))
const pick = (layout: SceneLayout, ...keys: string[]) =>
  spritesOf(layout).filter((s) => keys.includes(s.key))

describe('layout preview', () => {
  it('shows the scene as an active battle, ids being the layout keys', () => {
    const battle = previewBattle(scene(), units)
    expect(battle.phase).toBe('active')
    expect(battle.presentation.enemyPanel).toMatchObject({ mode: 'manual', visible: true })
    expect(spritesOf().map((s) => [s.key, s.side])).toEqual([
      ['enemy:gob:1', 'enemy'],
      ['enemy:gob:2', 'enemy'],
      ['party:lyra', 'ally'],
    ])
  })
})

describe('layout edits', () => {
  it('moving an automatic sprite starts from its formation slot', () => {
    const [, auto] = resolveSlots(
      [
        { placement: null, depth: null },
        { placement: null, depth: null },
      ],
      'enemy',
    )
    const next = moveSprites({}, pick({}, 'enemy:gob:2'), 25, -10)
    expect(next['enemy:gob:2']).toEqual({
      transform: { x: auto!.x + 25, y: auto!.y - 10, scale: auto!.scale, rotation: 0 },
      depth: null,
      flip: false,
    })
    expect(next['enemy:gob:1']).toBeUndefined()
  })

  it('keeps every sprite in its own half', () => {
    const next = moveSprites({}, pick({}, 'enemy:gob:1', 'party:lyra'), 2000, 0)
    expect(next['enemy:gob:1']!.transform!.x).toBe(960)
    expect(next['party:lyra']!.transform!.x).toBe(1880)
  })

  it('scales, rotates and sets values on the whole selection', () => {
    const both = pick({}, 'enemy:gob:1', 'enemy:gob:2')
    const bigger = scaleSprites({}, both, 0.5)
    expect(sharedValue(Object.values(bigger).map((s) => s.transform!.scale > 1.3))).toBe(true)
    const turned = rotateSprites({}, both, 190)
    expect(turned['enemy:gob:1']!.transform!.rotation).toBe(-170)
    const placed = setSpriteField({}, both, 'y', 900)
    expect(Object.values(placed).map((s) => s.transform!.y)).toEqual([900, 900])
  })

  it('mirrors all when any is not mirrored, and none when all are', () => {
    const layout: SceneLayout = { 'enemy:gob:1': { transform: null, depth: null, flip: true } }
    const once = toggleFlip(layout, pick(layout, 'enemy:gob:1', 'enemy:gob:2'))
    expect([once['enemy:gob:1']!.flip, once['enemy:gob:2']!.flip]).toEqual([true, true])
    const twice = toggleFlip(once, pick(once, 'enemy:gob:1', 'enemy:gob:2'))
    expect([twice['enemy:gob:1']!.flip, twice['enemy:gob:2']!.flip]).toEqual([false, false])
  })

  it('steps through depth layers, 0 meaning automatic', () => {
    const up = shiftDepth({}, pick({}, 'party:lyra'), 1)
    expect(up['party:lyra']!.depth).toBe(1)
    const back = shiftDepth(up, pick(up, 'party:lyra'), -1)
    expect(back['party:lyra']!.depth).toBeNull()
  })
})

describe('snapPoint', () => {
  const others = [{ x: 400, y: 700 }]

  it('snaps each axis to another sprite when close enough, and reports the guide', () => {
    const snapped = snapPoint(
      { x: 405, y: 640 },
      { others, guides: true, grid: null, threshold: 8 },
    )
    expect(snapped).toEqual({ x: 400, y: 640, guides: { vertical: [400], horizontal: [] } })
  })

  it('falls back to the grid, and ignores guides when they are off', () => {
    expect(
      snapPoint({ x: 405, y: 687 }, { others, guides: false, grid: 40, threshold: 8 }),
    ).toEqual({
      x: 400,
      y: 680,
      guides: { vertical: [], horizontal: [] },
    })
  })

  it('aligns to extra lines such as the centre of the field', () => {
    expect(
      snapPoint(
        { x: 955, y: 500 },
        { others: [], lines: [960], guides: true, grid: null, threshold: 8 },
      ).x,
    ).toBe(960)
  })
})
