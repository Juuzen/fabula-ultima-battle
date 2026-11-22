import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { createUnit, customEffectRef, type CustomEffect } from '@/domain'
import { LibraryDb } from '@/infra/library/libraryDb'

import { AssetRejectedError, createLibrary, type Library } from './library'

let lib: Library
let dbCount = 0

const file = (type: string, size = 4) => new Blob([new Uint8Array(size)], { type })

const effect = (videoAssetId: string, soundAssetId: string | null = null): CustomEffect => ({
  id: 'black-flame',
  name: 'Fiamma nera',
  videoAssetId,
  durationMs: 1200,
  impactAt: 0.4,
  scale: 1,
  soundAssetId,
  updatedAt: 0,
})

describe('library files', () => {
  beforeEach(() => {
    lib = createLibrary(new LibraryDb(`test-assets-${++dbCount}`), () => 1000)
  })

  afterEach(async () => {
    await lib.db.delete()
  })

  it('stores a file with its metadata and gives the bytes back', async () => {
    const asset = await lib.addAsset({
      name: ' goblin ',
      blob: file('image/png', 12),
      role: 'art',
      width: 64,
      height: 80,
    })
    expect(asset).toMatchObject({
      name: 'goblin',
      kind: 'image',
      role: 'art',
      mime: 'image/png',
      size: 12,
      width: 64,
      height: 80,
      durationMs: null,
    })
    expect(await lib.listAssets('art')).toEqual([asset])
    expect(await lib.listAssets('music')).toEqual([])
    const blob = await lib.getAssetBlob(asset.id)
    expect(blob?.size).toBe(12)
    expect(blob?.type).toBe('image/png')
  })

  it('refuses files the app cannot use, or that do not fit the shelf', async () => {
    await expect(
      lib.addAsset({ name: 'x', blob: file('text/plain'), role: 'art' }),
    ).rejects.toEqual(new AssetRejectedError('unsupported'))
    const wrong = lib.addAsset({ name: 'song', blob: file('audio/ogg'), role: 'art' })
    await expect(wrong).rejects.toMatchObject({ reason: 'wrongShelf' })
    // Backgrounds may be videos; effects may only be videos.
    await expect(
      lib.addAsset({ name: 'sea', blob: file('video/webm'), role: 'background' }),
    ).resolves.toMatchObject({ kind: 'video' })
    await expect(
      lib.addAsset({ name: 'pic', blob: file('image/png'), role: 'effect' }),
    ).rejects.toMatchObject({ reason: 'wrongShelf' })
  })

  it('deleting a file clears it everywhere and deletes the effects made from it', async () => {
    const art = await lib.addAsset({ name: 'gob', blob: file('image/png'), role: 'art' })
    const music = await lib.addAsset({ name: 'theme', blob: file('audio/ogg'), role: 'music' })
    const boom = await lib.addAsset({ name: 'boom', blob: file('audio/ogg'), role: 'sfx' })
    const video = await lib.addAsset({ name: 'flame', blob: file('video/webm'), role: 'effect' })

    const goblin = createUnit({ id: 'gob', kind: 'enemy', name: 'Goblin', maxHp: 20 })
    await lib.saveUnit({
      ...goblin,
      spriteAssetId: art.id,
      abilities: [
        {
          id: 'a',
          name: 'Morso',
          effect: customEffectRef('black-flame'),
          soundAssetId: boom.id,
          kind: 'damage',
          statuses: [],
          mpCostHint: null,
          amountHint: null,
        },
      ],
    })
    await lib.saveScene({
      id: 'porto',
      name: 'Porto',
      partyUnitIds: [],
      enemies: [],
      backgroundAssetId: null,
      musicAssetId: music.id,
      updatedAt: 0,
    })
    await lib.saveEffect(effect(video.id, boom.id))
    const sounds = await lib.getSoundSettings()
    await lib.saveSoundSettings({ ...sounds, system: { ...sounds.system, hit: boom.id } })

    expect(await lib.assetUsage(boom.id)).toBe(3) // ability, effect, hit sound
    expect(await lib.assetUsage(art.id)).toBe(1)

    await lib.deleteAsset(boom.id)
    expect((await lib.listEffects())[0]?.soundAssetId).toBeNull()
    expect((await lib.getSoundSettings()).system.hit).toBeNull()
    expect((await lib.getUnits(['gob'])).get('gob')?.abilities[0]?.soundAssetId).toBeNull()

    await lib.deleteAsset(video.id)
    expect(await lib.listEffects()).toEqual([])
    // The ability that used the deleted effect goes back to no effect.
    expect((await lib.getUnits(['gob'])).get('gob')?.abilities[0]?.effect).toBeNull()

    await lib.deleteAsset(art.id)
    await lib.deleteAsset(music.id)
    expect((await lib.getUnits(['gob'])).get('gob')?.spriteAssetId).toBeNull()
    expect((await lib.listScenes())[0]?.musicAssetId).toBeNull()
    expect(await lib.listAssets()).toEqual([])
    expect(await lib.getAssetBlob(art.id)).toBeUndefined()
  })

  it('reads sound settings with defaults for missing or unknown slots', async () => {
    expect((await lib.getSoundSettings()).system.ko).toBeNull()
    await lib.db.settings.put({ key: 'sounds', value: { system: { ko: 'snd-ko' } } })
    const sounds = await lib.getSoundSettings()
    expect(sounds.system).toMatchObject({ ko: 'snd-ko', hit: null })
    expect(sounds.effects.fire).toBeNull()
  })

  it('old sheets without ability sounds still parse', async () => {
    const goblin = createUnit({ id: 'gob', kind: 'enemy', name: 'Goblin', maxHp: 20 })
    const ability = {
      id: 'a',
      name: 'Morso',
      effect: 'slash',
      kind: 'damage',
      statuses: [],
      mpCostHint: null,
      amountHint: null,
    }
    await lib.db.units.put({ ...goblin, abilities: [ability] } as never)
    const [read] = await lib.listUnits('enemy')
    expect(read?.abilities[0]?.soundAssetId).toBeNull()
  })
})
