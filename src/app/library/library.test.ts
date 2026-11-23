import { Dexie } from 'dexie'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { createUnit, type BattleScene } from '@/domain'
import { LibraryDb } from '@/infra/library/libraryDb'

import { createLibrary, type Library } from './library'

let lib: Library
let dbCount = 0

const lyra = createUnit({ id: 'lyra', kind: 'party', name: 'Lyra', maxHp: 40, maxMp: 30 })
const bastian = createUnit({ id: 'bastian', kind: 'party', name: 'Bastian', maxHp: 60 })
const goblin = createUnit({ id: 'gob', kind: 'enemy', name: 'Goblin', maxHp: 20, tag: 'Bestia' })

const scene: BattleScene = {
  id: 'porto',
  name: 'Agguato al porto',
  partyUnitIds: ['lyra', 'bastian'],
  enemies: [{ unitId: 'gob', count: 3 }],
  backgroundAssetId: null,
  musicAssetId: null,
  layout: {},
  updatedAt: 0,
}

describe('library', () => {
  beforeEach(() => {
    lib = createLibrary(new LibraryDb(`test-library-${++dbCount}`), () => 1000)
  })

  afterEach(async () => {
    await lib.db.delete()
  })

  it('saves sheets with a timestamp and lists them by kind, sorted by name', async () => {
    await lib.saveUnit(lyra)
    await lib.saveUnit(bastian)
    await lib.saveUnit(goblin)
    const party = await lib.listUnits('party')
    expect(party.map((u) => u.name)).toEqual(['Bastian', 'Lyra'])
    expect(party[0]?.updatedAt).toBe(1000)
    expect((await lib.listUnits('enemy')).map((u) => u.name)).toEqual(['Goblin'])
  })

  it('refuses invalid sheets and skips corrupt rows when reading', async () => {
    await expect(lib.saveUnit({ ...goblin, maxHp: 0 })).rejects.toBeInstanceOf(Error)
    await lib.db.units.put({ ...goblin, id: 'broken', name: '' })
    await lib.saveUnit(goblin)
    expect((await lib.listUnits('enemy')).map((u) => u.id)).toEqual(['gob'])
  })

  it('saving a scene drops the layout of sprites no longer in it', async () => {
    const sprite = {
      transform: { x: 300, y: 600, scale: 1, rotation: 0 },
      depth: null,
      flip: false,
    }
    const saved = await lib.saveScene({
      ...scene,
      enemies: [{ unitId: 'gob', count: 1 }],
      layout: { 'enemy:gob:1': sprite, 'enemy:gob:3': sprite },
    })
    expect(Object.keys(saved.layout)).toEqual(['enemy:gob:1'])
  })

  it('deleting a sheet removes it from the scenes that used it', async () => {
    await Promise.all([lib.saveUnit(lyra), lib.saveUnit(bastian), lib.saveUnit(goblin)])
    await lib.saveScene(scene)
    await lib.deleteUnit('gob')
    await lib.deleteUnit('lyra')
    const [saved] = await lib.listScenes()
    expect(saved).toMatchObject({ partyUnitIds: ['bastian'], enemies: [] })
  })

  it('writes party PV/PM back (clamped) and Riposo restores everyone', async () => {
    await Promise.all([lib.saveUnit(lyra), lib.saveUnit(goblin)])
    await lib.writeBackParty([
      { unitId: 'lyra', hp: 7, mp: 99 },
      { unitId: 'gob', hp: 1, mp: 0 },
    ])
    const units = await lib.getUnits(['lyra', 'gob'])
    expect(units.get('lyra')).toMatchObject({ hp: 7, mp: 30 })
    expect(units.get('gob')).toMatchObject({ hp: 20 })

    await lib.restParty()
    expect((await lib.getUnits(['lyra'])).get('lyra')).toMatchObject({ hp: 40, mp: 30 })
  })
})

describe('library database upgrade', () => {
  it('v3 moves mirroring from the sheets to the scenes that use them', async () => {
    const name = `test-library-upgrade-${++dbCount}`
    const v2 = new Dexie(name)
    v2.version(2).stores({
      units: 'id, kind, name',
      scenes: 'id, name',
      assets: 'id, role, kind, name',
      assetBlobs: 'id',
      effects: 'id, name',
      settings: 'key',
    })
    const { layout: _none, ...oldScene } = scene
    await v2.table('units').bulkPut([
      { ...lyra, flipSprite: true },
      { ...bastian, flipSprite: false },
      { ...goblin, flipSprite: true },
    ])
    await v2.table('scenes').put(oldScene)
    v2.close()

    const upgraded = createLibrary(new LibraryDb(name))
    const [saved] = await upgraded.listScenes()
    const flipped = { transform: null, depth: null, flip: true }
    expect(saved?.layout).toEqual({
      'party:lyra': flipped,
      'enemy:gob:1': flipped,
      'enemy:gob:2': flipped,
      'enemy:gob:3': flipped,
    })
    const raw = await upgraded.db.units.get('lyra')
    expect(raw).not.toHaveProperty('flipSprite')
    await upgraded.db.delete()
  })
})
