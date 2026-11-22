import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { library } from '@/app/library/library'
import { battleStore } from '@/app/store'
import { createEmptyBattle, createUnit } from '@/domain'

import { renderMaster } from '../renderMaster.test-utils'

// jsdom cannot decode media: sizes and lengths stay unknown.
vi.mock('./probeMedia', () => ({
  probeMedia: async () => ({ width: null, height: null, durationMs: 1600 }),
}))

const goblin = createUnit({ id: 'gob', kind: 'enemy', name: 'Goblin', maxHp: 20 })
const png = (name: string) => new File([new Uint8Array(8)], name, { type: 'image/png' })
const ogg = (name: string) => new File([new Uint8Array(8)], name, { type: 'audio/ogg' })
const webm = (name: string) => new File([new Uint8Array(8)], name, { type: 'video/webm' })

describe('asset library', () => {
  beforeEach(async () => {
    localStorage.clear()
    battleStore.setState({ battle: createEmptyBattle(), lastError: null })
    await Promise.all(library.db.tables.map((table) => table.clear()))
  })

  it('uploads a sprite from the sheet: it goes to the library and can be reused', async () => {
    await library.saveUnit(goblin)
    const user = userEvent.setup()
    renderMaster('/master/enemies')
    const editor = await screen.findByRole('article', { name: 'Goblin' })
    const sprite = within(editor).getByRole('group', { name: 'Sprite' })

    await user.upload(within(sprite).getByLabelText('Sprite: Carica'), png('goblin-idle.png'))
    expect(await within(sprite).findByText('goblin-idle')).toBeInTheDocument()
    await waitFor(async () => {
      const [asset] = await library.listAssets('art')
      expect(asset).toMatchObject({ name: 'goblin-idle', kind: 'image', role: 'art' })
      expect((await library.getUnits(['gob'])).get('gob')?.spriteAssetId).toBe(asset?.id)
    })

    // The same file is offered for the portrait.
    const portrait = within(editor).getByRole('group', { name: 'Ritratto' })
    await user.click(
      within(portrait).getByRole('button', { name: 'Ritratto: scegli dalla libreria' }),
    )
    await user.click(await screen.findByRole('button', { name: 'goblin-idle' }))
    await waitFor(async () => {
      const unit = (await library.getUnits(['gob'])).get('gob')
      expect(unit?.portraitAssetId).toBe(unit?.spriteAssetId)
    })
  })

  it('refuses a file that does not fit, and says what is expected', async () => {
    await library.saveUnit(goblin)
    const user = userEvent.setup({ applyAccept: false })
    renderMaster('/master/enemies')
    const editor = await screen.findByRole('article', { name: 'Goblin' })
    const sprite = within(editor).getByRole('group', { name: 'Sprite' })
    await user.upload(within(sprite).getByLabelText('Sprite: Carica'), ogg('battle.ogg'))
    expect(await within(sprite).findByRole('alert')).toHaveTextContent(/servono immagini/)
    expect(await library.listAssets()).toEqual([])
  })

  it('assigns system sounds in the Audio section', async () => {
    const boom = await library.addAsset({ name: 'Boom', blob: ogg('boom.ogg'), role: 'sfx' })
    const user = userEvent.setup()
    renderMaster('/master/audio')
    const ko = await screen.findByRole('group', { name: 'KO' })
    await user.click(within(ko).getByRole('button', { name: 'KO: scegli dalla libreria' }))
    await user.click(await screen.findByRole('button', { name: 'Boom' }))
    await waitFor(async () => expect((await library.getSoundSettings()).system.ko).toBe(boom.id))
    await waitFor(() => expect(within(ko).getByTestId('asset-name')).toHaveTextContent('Boom'))
  })

  it('creates a custom effect from a video, with the video length and an impact point', async () => {
    const user = userEvent.setup()
    renderMaster('/master/video')
    await user.click(await screen.findByRole('button', { name: 'Nuovo effetto' }))
    await user.upload(screen.getByLabelText('Video: Carica'), webm('Fiamma nera.webm'))

    const card = await screen.findByRole('listitem', { name: 'Effetto Fiamma nera' })
    await waitFor(async () =>
      expect(await library.listEffects()).toMatchObject([
        { name: 'Fiamma nera', durationMs: 1600, impactAt: 0.5, scale: 1 },
      ]),
    )
    // The video is also on its shelf.
    expect(await library.listAssets('effect')).toHaveLength(1)

    const name = within(card).getByLabelText('Nome')
    await user.clear(name)
    await user.type(name, 'Fiamma oscura')
    await waitFor(async () => expect((await library.listEffects())[0]?.name).toBe('Fiamma oscura'))
  })

  it('deletes a file after confirming, saying where it was used', async () => {
    const theme = await library.addAsset({ name: 'Tema', blob: ogg('tema.ogg'), role: 'music' })
    await library.saveScene({
      id: 'porto',
      name: 'Porto',
      partyUnitIds: [],
      enemies: [],
      backgroundAssetId: null,
      musicAssetId: theme.id,
      updatedAt: 0,
    })
    const user = userEvent.setup()
    renderMaster('/master/audio')
    const row = await screen.findByRole('listitem', { name: 'Tema' })
    await user.click(within(row).getByRole('button', { name: 'Elimina Tema' }))
    expect(await within(row).findByText(/Usato in 1 punto/)).toBeInTheDocument()
    await user.click(within(row).getByRole('button', { name: 'Conferma: elimina' }))
    await waitFor(async () => expect(await library.listAssets()).toEqual([]))
    expect((await library.listScenes())[0]?.musicAssetId).toBeNull()
  })
})

describe('live audio', () => {
  beforeEach(async () => {
    localStorage.clear()
    battleStore.setState({ battle: createEmptyBattle(), lastError: null })
    await library.db.assets.clear()
  })

  it('changes track and volumes, and mutes the player screen', async () => {
    const theme = await library.addAsset({ name: 'Tema', blob: ogg('tema.ogg'), role: 'music' })
    const user = userEvent.setup()
    renderMaster('/master/screen')
    await user.click(await screen.findByRole('button', { name: 'Audio dello schermo giocatori' }))
    const panel = await screen.findByRole('dialog', { name: 'Audio dello schermo giocatori' })
    await user.selectOptions(await within(panel).findByLabelText('Brano'), 'Tema')
    expect(battleStore.getState().battle.presentation.audio.musicAssetId).toBe(theme.id)

    fireEvent.change(within(panel).getByLabelText('Volume musica'), { target: { value: '35' } })
    expect(battleStore.getState().battle.presentation.audio.musicVolume).toBe(35)

    await user.click(screen.getByRole('button', { name: 'Silenzia' }))
    expect(battleStore.getState().battle.presentation.audio.muted).toBe(true)
    expect(screen.getByRole('button', { name: 'Silenzia' })).toHaveAttribute('aria-pressed', 'true')
  })
})
