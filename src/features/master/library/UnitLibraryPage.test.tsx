import { act, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'

import { library } from '@/app/library/library'
import { battleStore } from '@/app/store'
import { combatantFromUnit, createCombatant, createEmptyBattle, createUnit } from '@/domain'

import { renderMaster } from '../renderMaster.test-utils'

const lyra = createUnit({ id: 'lyra', kind: 'party', name: 'Lyra', maxHp: 40, maxMp: 30 })
const goblin = createUnit({ id: 'gob', kind: 'enemy', name: 'Goblin', maxHp: 20, tag: 'Bestia' })
const drake = createUnit({ id: 'drake', kind: 'enemy', name: 'Drago', maxHp: 120, tag: 'Boss' })

const stored = async (id: string) => (await library.getUnits([id])).get(id)

function seedBattle(phase: 'preparation' | 'active' = 'preparation') {
  battleStore.setState({
    battle: { ...createEmptyBattle(), phase },
    lastError: null,
  })
}

describe('unit libraries', () => {
  beforeEach(async () => {
    localStorage.clear()
    seedBattle()
    await library.db.units.clear()
    await library.db.scenes.clear()
  })

  it('creates an enemy sheet and saves edits by itself', async () => {
    const user = userEvent.setup()
    renderMaster('/master/enemies')
    expect(await screen.findByText(/Il bestiario è vuoto/)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Nuovo nemico' }))
    const editor = await screen.findByRole('article', { name: 'Nuovo nemico' })
    const name = within(editor).getByLabelText('Nome')
    expect(name).toHaveFocus()

    await user.clear(name)
    await user.type(name, 'Goblin')
    const maxHp = within(editor).getByLabelText('PV max')
    await user.clear(maxHp)
    await user.type(maxHp, '25')

    await waitFor(async () =>
      expect(await library.listUnits('enemy')).toMatchObject([
        { name: 'Goblin', maxHp: 25, hp: 25 },
      ]),
    )
    expect(within(editor).getByRole('status')).toHaveTextContent('Salvato')
  })

  it('does not save an invalid sheet and says why', async () => {
    await library.saveUnit(goblin)
    const user = userEvent.setup()
    renderMaster('/master/enemies')
    const editor = await screen.findByRole('article', { name: 'Goblin' })

    await user.clear(within(editor).getByLabelText('Nome'))
    expect(within(editor).getByText('Serve un nome.')).toBeInTheDocument()
    expect(within(editor).getByRole('status')).toHaveTextContent('Non salvato')
    await new Promise((r) => setTimeout(r, 500))
    expect((await stored('gob'))?.name).toBe('Goblin')
  })

  it('adds an ability whose MP cost and amount are only reminders', async () => {
    await library.saveUnit(goblin)
    const user = userEvent.setup()
    renderMaster('/master/enemies')
    const editor = await screen.findByRole('article', { name: 'Goblin' })

    await user.click(within(editor).getByRole('button', { name: 'Aggiungi abilità' }))
    const ability = within(editor).getByRole('listitem', { name: 'Nuova abilità' })
    const abilityName = within(ability).getByLabelText('Nome abilità')
    await user.clear(abilityName)
    await user.type(abilityName, 'Morso')
    await user.click(within(ability).getByRole('radio', { name: 'Danno PV' }))
    await user.click(within(ability).getByRole('button', { name: 'Avvelenato' }))
    await user.type(within(ability).getByLabelText('Valore'), '8')

    await waitFor(async () =>
      expect((await stored('gob'))?.abilities).toMatchObject([
        { name: 'Morso', kind: 'damage', statuses: ['poisoned'], amountHint: 8, mpCostHint: null },
      ]),
    )
  })

  it('searches by name and filters enemies by category', async () => {
    await Promise.all([library.saveUnit(goblin), library.saveUnit(drake)])
    const user = userEvent.setup()
    renderMaster('/master/enemies')
    const list = await screen.findByRole('list', { name: 'Schede dei nemici' })
    expect(within(list).getAllByRole('button')).toHaveLength(2)

    await user.selectOptions(screen.getByRole('combobox', { name: 'Categoria' }), 'Boss')
    expect(
      within(list)
        .getAllByRole('button')
        .map((b) => b.textContent),
    ).toEqual([expect.stringContaining('Drago')])
    await user.selectOptions(screen.getByRole('combobox', { name: 'Categoria' }), '')
    await user.type(screen.getByLabelText('Cerca per nome'), 'gob')
    expect(
      within(list)
        .getAllByRole('button')
        .map((b) => b.textContent),
    ).toEqual([expect.stringContaining('Goblin')])
  })

  it('stays editable in battle: deployed copies follow the sheet, keeping their number', async () => {
    await library.saveUnit(goblin)
    battleStore.setState({
      battle: {
        ...createEmptyBattle(),
        phase: 'active',
        combatants: [
          createCombatant({ ...combatantFromUnit(goblin, 'g1', 'Goblin 1'), hp: 15 }),
          createCombatant(combatantFromUnit(goblin, 'g2', 'Goblin 2')),
        ],
      },
      lastError: null,
    })
    const user = userEvent.setup()
    renderMaster('/master/enemies')
    const editor = await screen.findByRole('article', { name: 'Goblin' })
    expect(screen.getByRole('button', { name: 'Nuovo nemico' })).toBeEnabled()
    expect(within(editor).getByText(/toglila dalla battaglia/)).toBeInTheDocument()

    const name = within(editor).getByLabelText('Nome')
    await user.clear(name)
    await user.type(name, 'Orco')
    const maxHp = within(editor).getByLabelText('PV max')
    await user.clear(maxHp)
    await user.type(maxHp, '12')

    await waitFor(() =>
      expect(battleStore.getState().battle.combatants).toMatchObject([
        { name: 'Orco 1', maxHp: 12, hp: 12 },
        { name: 'Orco 2', maxHp: 12, hp: 12 },
      ]),
    )
  })

  it("shows a deployed party member's live PV/PM, read-only", async () => {
    await library.saveUnit(lyra)
    battleStore.setState({
      battle: {
        ...createEmptyBattle(),
        phase: 'active',
        combatants: [createCombatant({ ...combatantFromUnit(lyra, 'c-lyra'), hp: 9, mp: 4 })],
      },
      lastError: null,
    })
    renderMaster('/master/party')
    const editor = await screen.findByRole('article', { name: 'Lyra' })
    expect(within(editor).getByText('9 / 40')).toBeInTheDocument()
    expect(within(editor).getByText('4 / 30')).toBeInTheDocument()
    expect(within(editor).queryByLabelText('PV attuali')).not.toBeInTheDocument()
  })

  it('deletes a sheet after confirmation', async () => {
    await Promise.all([library.saveUnit(goblin), library.saveUnit(drake)])
    const user = userEvent.setup()
    renderMaster('/master/enemies?id=gob')
    const editor = await screen.findByRole('article', { name: 'Goblin' })

    await user.click(within(editor).getByRole('button', { name: 'Elimina scheda' }))
    await user.click(within(editor).getByRole('button', { name: 'Conferma: elimina Goblin' }))
    expect(await screen.findByRole('article', { name: 'Drago' })).toBeInTheDocument()
    expect(await stored('gob')).toBeUndefined()
  })

  it('party: current PV/PM come back from the field and Riposo restores them', async () => {
    await library.saveUnit(lyra)
    battleStore.setState({
      battle: {
        ...createEmptyBattle('Agguato'),
        phase: 'active',
        combatants: [
          createCombatant({ ...combatantFromUnit(lyra, 'c-lyra'), hp: 9, mp: 4 }),
          createCombatant({ id: 'orc', name: 'Orco', side: 'enemy', maxHp: 50 }),
        ],
      },
      lastError: null,
    })
    const user = userEvent.setup()
    renderMaster('/master/party')
    await screen.findByRole('article', { name: 'Lyra' })

    act(() => {
      battleStore.getState().dispatch({ type: 'END_BATTLE' })
    })
    const editor = await screen.findByRole('article', { name: 'Lyra' })
    await waitFor(() => expect(within(editor).getByLabelText('PV attuali')).toHaveValue(9))
    expect(within(editor).getByLabelText('PM attuali')).toHaveValue(4)
    expect(await stored('lyra')).toMatchObject({ hp: 9, mp: 4 })

    await user.click(screen.getByRole('button', { name: 'Riposo' }))
    await waitFor(() => expect(within(editor).getByLabelText('PV attuali')).toHaveValue(40))
    expect(screen.getByText('Party a riposo: PV e PM al massimo.')).toBeInTheDocument()
  })
})
