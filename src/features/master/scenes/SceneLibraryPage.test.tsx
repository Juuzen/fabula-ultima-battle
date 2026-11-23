import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'

import { library } from '@/app/library/library'
import { battleStore } from '@/app/store'
import { createEmptyBattle, createUnit } from '@/domain'
import { resolveSlots } from '@/features/display'

import { renderMaster } from '../renderMaster.test-utils'

const lyra = createUnit({ id: 'lyra', kind: 'party', name: 'Lyra', maxHp: 40 })
const goblin = createUnit({ id: 'gob', kind: 'enemy', name: 'Goblin', maxHp: 20, tag: 'Bestia' })

describe('Battle scenes page', () => {
  beforeEach(async () => {
    localStorage.clear()
    battleStore.setState({ battle: createEmptyBattle(), lastError: null })
    await library.db.units.clear()
    await library.db.scenes.clear()
    await Promise.all([library.saveUnit(lyra), library.saveUnit(goblin)])
  })

  it('prepares a scene and loads it into Screen Control', async () => {
    const user = userEvent.setup()
    const router = renderMaster('/master/scenes')
    await user.click(await screen.findByRole('button', { name: 'Nuova scena' }))
    const editor = await screen.findByRole('article', { name: 'Nuova scena' })

    const name = within(editor).getByLabelText('Nome della battaglia')
    expect(name).toHaveFocus()
    await user.clear(name)
    await user.type(name, 'Agguato al porto')
    await user.click(await within(editor).findByRole('checkbox', { name: /Lyra/ }))
    await user.selectOptions(within(editor).getByLabelText('Aggiungi nemico'), 'Goblin (Bestia)')
    await user.click(within(editor).getByRole('button', { name: 'Uno in più: Goblin' }))
    expect(within(editor).getByText('1 PG · 2 nemici')).toBeInTheDocument()

    await waitFor(async () =>
      expect(await library.listScenes()).toMatchObject([
        {
          name: 'Agguato al porto',
          partyUnitIds: ['lyra'],
          enemies: [{ unitId: 'gob', count: 2 }],
        },
      ]),
    )

    await user.click(within(editor).getByRole('button', { name: 'Carica in Controllo schermo' }))
    await waitFor(() => expect(router.state.location.pathname).toBe('/master/screen'))
    expect(await screen.findByText(/Scena caricata: Agguato al porto/)).toBeInTheDocument()
    expect(battleStore.getState().battle.combatants.map((c) => c.name)).toEqual([
      'Lyra',
      'Goblin 1',
      'Goblin 2',
    ])
  })

  it('a deleted enemy sheet disappears from the scene', async () => {
    await library.saveScene({
      id: 's',
      name: 'Bosco',
      partyUnitIds: [],
      enemies: [{ unitId: 'gob', count: 3 }],
      backgroundAssetId: null,
      musicAssetId: null,
      layout: {},
      updatedAt: 0,
    })
    await library.deleteUnit('gob')
    renderMaster('/master/scenes')
    const editor = await screen.findByRole('article', { name: 'Bosco' })
    expect(within(editor).getByText('Nessun nemico in questa scena.')).toBeInTheDocument()
  })

  it('lays out the sprites in the live preview, saves them and loads them on the field', async () => {
    await library.saveScene({
      id: 's',
      name: 'Bosco',
      partyUnitIds: ['lyra'],
      enemies: [{ unitId: 'gob', count: 2 }],
      backgroundAssetId: null,
      musicAssetId: null,
      layout: {},
      updatedAt: 0,
    })
    const user = userEvent.setup()
    renderMaster('/master/scenes')
    const editor = await screen.findByRole('article', { name: 'Bosco' })
    expect(await within(editor).findByText(/Formazione automatica/)).toBeInTheDocument()
    const open = within(editor).getByRole('button', { name: 'Apri anteprima live' })
    await user.click(open)

    const preview = await screen.findByRole('dialog', { name: 'Anteprima live' })
    const list = within(preview).getByRole('navigation', { name: 'Sprite della scena' })
    await user.click(within(list).getByRole('button', { name: /Goblin 2/ }))
    const inspector = within(preview).getByRole('complementary', { name: 'Proprietà dello sprite' })
    expect(within(inspector).getByRole('heading', { name: 'Goblin 2' })).toBeInTheDocument()

    // Keyboard: 10 px right, mirrored, one layer forward.
    await user.keyboard('{Shift>}{ArrowRight}{/Shift}f{PageUp}')
    // Inspector: exact size.
    const scale = within(inspector).getByLabelText('Scala %')
    await user.clear(scale)
    await user.type(scale, '150{Enter}')
    expect(scale).not.toHaveFocus()

    const [, auto] = resolveSlots(
      [
        { placement: null, depth: null },
        { placement: null, depth: null },
      ],
      'enemy',
    )
    await waitFor(async () =>
      expect((await library.listScenes())[0]?.layout).toEqual({
        'enemy:gob:2': {
          transform: { x: auto!.x + 10, y: auto!.y, scale: 1.5, rotation: 0 },
          depth: 1,
          flip: true,
        },
      }),
    )

    // Esc deselects, then closes; focus goes back to where the GM opened it.
    await user.keyboard('{Escape}{Escape}')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(open).toHaveFocus()
    expect(within(editor).getByText(/1 sprite disposto a mano/)).toBeInTheDocument()

    await user.click(within(editor).getByRole('button', { name: 'Carica in Controllo schermo' }))
    const goblin2 = battleStore.getState().battle.combatants.find((c) => c.name === 'Goblin 2')
    expect(goblin2).toMatchObject({ placement: { scale: 1.5 }, depth: 1, flipSprite: true })
  })

  it('restores the default layout, keeping the mirroring', async () => {
    const transform = { x: 300, y: 600, scale: 2, rotation: 15 }
    await library.saveScene({
      id: 's',
      name: 'Bosco',
      partyUnitIds: ['lyra'],
      enemies: [{ unitId: 'gob', count: 1 }],
      backgroundAssetId: null,
      musicAssetId: null,
      layout: {
        'enemy:gob:1': { transform, depth: 2, flip: true },
        'party:lyra': { transform: { ...transform, x: 1500 }, depth: null, flip: false },
      },
      updatedAt: 0,
    })
    const user = userEvent.setup()
    renderMaster('/master/scenes')
    const editor = await screen.findByRole('article', { name: 'Bosco' })
    expect(await within(editor).findByText(/2 sprite disposti a mano/)).toBeInTheDocument()
    await user.click(within(editor).getByRole('button', { name: 'Ripristina layout di default' }))
    await user.click(within(editor).getByRole('button', { name: /Conferma: tutti in formazione/ }))
    await waitFor(async () =>
      expect((await library.listScenes())[0]?.layout).toEqual({
        'enemy:gob:1': { transform: null, depth: null, flip: true },
      }),
    )
    expect(await within(editor).findByText(/Formazione automatica/)).toBeInTheDocument()
  })
})
