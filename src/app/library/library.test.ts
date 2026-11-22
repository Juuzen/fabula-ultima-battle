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
