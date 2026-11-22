import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'

import { library } from '@/app/library/library'
import { battleStore } from '@/app/store'
import { createEmptyBattle, createUnit } from '@/domain'

import { renderMaster } from '../renderMaster.test-utils'

const lyra = createUnit({ id: 'lyra', kind: 'party', name: 'Lyra', maxHp: 40 })
const goblin = createUnit({ id: 'gob', kind: 'enemy', name: 'Goblin', maxHp: 20, tag: 'Bestia' })

describe('Battle scenes page', () => {
  beforeEach(async () => {
    localStorage.clear()
    battleStore.setState({ battle: createEmptyBattle(), past: [], lastError: null })
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
      updatedAt: 0,
    })
    await library.deleteUnit('gob')
    renderMaster('/master/scenes')
    const editor = await screen.findByRole('article', { name: 'Bosco' })
    expect(within(editor).getByText('Nessun nemico in questa scena.')).toBeInTheDocument()
  })
})
