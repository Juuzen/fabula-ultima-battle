import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'

import { library } from '@/app/library/library'
import { battleStore } from '@/app/store'
import { createCombatant, createEmptyBattle, createUnit, type BattleState } from '@/domain'

import { useActionDraft } from '../action/actionDraft'
import { usePreviewWindow } from '../preview/previewWindowStore'
import { renderMaster } from '../renderMaster.test-utils'

const battle = () => battleStore.getState().battle
const find = (id: string) => battle().combatants.find((c) => c.id === id)!
const card = (name: string) => screen.getByRole('listitem', { name })
const detail = () => screen.getByRole('region', { name: 'Dettaglio' })
const target = (name: string) =>
  within(detail()).getByRole('checkbox', { name: `Bersaglio: ${name}` })
const amount = (name: string) => within(detail()).getByLabelText(`Valore per ${name}`)

const maga = createUnit({
  id: 'u-maga',
  kind: 'party',
  name: 'Maga',
  maxHp: 30,
  maxMp: 40,
  notes: 'Debole al ghiaccio.',
  abilities: [
    {
      id: 'fire',
      name: 'Palla di fuoco',
      effect: 'fire',
      kind: 'damage',
      statuses: ['shaken'],
      mpCostHint: 10,
      amountHint: 25,
    },
    {
      id: 'calm',
      name: 'Calma',
      effect: null,
      kind: null,
      statuses: [],
      mpCostHint: null,
      amountHint: null,
    },
  ],
})

function seed(phase: BattleState['phase'] = 'active') {
  battleStore.setState({
    battle: {
      ...createEmptyBattle(),
      phase,
      combatants: [
        createCombatant({
          id: 'mage',
          name: 'Maga',
          side: 'ally',
          maxHp: 30,
          maxMp: 40,
          unitId: 'u-maga',
        }),
        createCombatant({ id: 'gob', name: 'Goblin', side: 'enemy', maxHp: 20 }),
        createCombatant({
          id: 'wolf',
          name: 'Lupo',
          side: 'enemy',
          maxHp: 50,
          statuses: ['poisoned'],
        }),
      ],
    },
    lastError: null,
  })
}

async function select(name: string) {
  const user = userEvent.setup()
  renderMaster()
  await user.click(within(card(name)).getByRole('button', { name }))
  return user
}

describe('action composer', () => {
  beforeEach(async () => {
    localStorage.clear()
    useActionDraft.setState(useActionDraft.getInitialState())
    usePreviewWindow.setState({ ...usePreviewWindow.getInitialState(), open: false })
    await library.db.units.clear()
    await library.saveUnit(maga)
    seed()
  })

  it('lists the saved abilities of the selected combatant, its notes and a free action', async () => {
    const user = await select('Maga')
    const fire = await within(detail()).findByRole('button', { name: /Palla di fuoco/ })
    expect(fire).toHaveTextContent('Danno PV · Fuoco · ~10 PM · ~25')
    expect(within(detail()).getByRole('button', { name: /Calma/ })).toHaveTextContent(
      'Solo status · Nessun effetto',
    )
    await user.click(within(detail()).getByText('Note del GM'))
    expect(within(detail()).getByText('Debole al ghiaccio.')).toBeVisible()
  })

  it('an ability prefills the composer; MP cost and amounts stay hints', async () => {
    const user = await select('Maga')
    await user.click(await within(detail()).findByRole('button', { name: /Palla di fuoco/ }))

    expect(within(detail()).getByLabelText('Nome azione')).toHaveValue('Palla di fuoco')
    expect(within(detail()).getByLabelText('Effetto')).toHaveValue('fire')
    const mpCost = within(detail()).getByLabelText(/Costo PM/)
    expect(mpCost).toHaveValue(null)
    expect(mpCost).toHaveAttribute('placeholder', 'promemoria: 10')

    await user.click(target('Goblin'))
    expect(amount('Goblin')).toHaveValue(null)
    expect(amount('Goblin')).toHaveAttribute('placeholder', 'promemoria: 25')
    expect(within(detail()).getByRole('button', { name: 'Aggiungi Scosso' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
  })

  it('performs a multi-target action with its own outcome per target', async () => {
    const user = await select('Maga')
    await user.click(await within(detail()).findByRole('button', { name: /Palla di fuoco/ }))
    await user.type(within(detail()).getByLabelText(/Costo PM/), '10')
    await user.click(target('Goblin'))
    await user.click(target('Lupo'))
    await user.type(amount('Goblin'), '12')
    await user.type(amount('Lupo'), '30')
    // Lupo resists the fear but loses its poison.
    const lupo = within(detail()).getByRole('group', { name: 'Status per Lupo' })
    await user.click(within(lupo).getByRole('button', { name: 'Aggiungi Scosso' }))
    await user.click(within(lupo).getByRole('button', { name: 'Togli Avvelenato' }))
    expect(card('Goblin')).toContainElement(
      within(card('Goblin')).getByLabelText("Bersaglio dell'azione"),
    )

    await user.click(within(detail()).getByRole('button', { name: 'Agisci' }))
    expect(find('mage').mp).toBe(30)
    expect(find('gob')).toMatchObject({ hp: 8, statuses: ['shaken'] })
    expect(find('wolf')).toMatchObject({ hp: 20, statuses: [] })
    // Back to the ability list of the same actor.
    expect(
      await within(detail()).findByRole('button', { name: /Palla di fuoco/ }),
    ).toBeInTheDocument()
  })

  it('Enter in a target amount acts; a different kind heals instead', async () => {
    battleStore.getState().dispatch({ type: 'SET_HP', id: 'gob', hp: 5 })
    const user = await select('Maga')
    await user.click(within(detail()).getByRole('button', { name: /Azione libera/ }))
    await user.click(target('Goblin'))
    await user.selectOptions(within(detail()).getByLabelText('Tipo per Goblin'), 'Cura PV')
    await user.type(amount('Goblin'), '7{Enter}')
    expect(find('gob').hp).toBe(12)
  })

  it('explains what is missing and keeps "Agisci" disabled', async () => {
    const user = await select('Maga')
    await user.click(within(detail()).getByRole('button', { name: /Azione libera/ }))
    const act = within(detail()).getByRole('button', { name: 'Agisci' })
    expect(act).toBeDisabled()
    expect(within(detail()).getByText('Scegli i bersagli qui sotto.')).toBeInTheDocument()

    await user.click(target('Goblin'))
    expect(
      within(detail()).getByText('Ogni bersaglio ha bisogno di un valore o di uno status.'),
    ).toBeInTheDocument()
    await user.type(within(detail()).getByLabelText(/Costo PM/), '99')
    await user.type(amount('Goblin'), '3')
    expect(within(detail()).getByText('PM insufficienti (40 disponibili).')).toBeInTheDocument()
    expect(act).toBeDisabled()
  })

  it('the GM acts with nobody selected: no actor, optional name, no effect', async () => {
    const user = userEvent.setup()
    renderMaster()
    expect(within(detail()).getByRole('heading', { name: 'Azione del GM' })).toBeInTheDocument()
    expect(within(detail()).queryByLabelText(/Costo PM/)).not.toBeInTheDocument()
    expect(within(detail()).getByLabelText('Effetto')).toHaveValue('')

    await user.click(target('Maga'))
    await user.selectOptions(within(detail()).getByLabelText('Tipo per Maga'), 'Recupero PM')
    battleStore.getState().dispatch({ type: 'SET_MP', id: 'mage', mp: 10 })
    await user.type(amount('Maga'), '15')
    await user.click(within(detail()).getByRole('button', { name: 'Agisci' }))
    expect(find('mage').mp).toBe(25)
  })

  it('works during preparation, telling the GM the players see no sequence', async () => {
    seed('preparation')
    const user = userEvent.setup()
    renderMaster()
    expect(within(detail()).getByText(/i giocatori non vedono la sequenza/)).toBeInTheDocument()
    await user.click(target('Goblin'))
    await user.type(amount('Goblin'), '4')
    await user.click(within(detail()).getByRole('button', { name: 'Agisci' }))
    await waitFor(() => expect(find('gob').hp).toBe(16))
  })

  it('Esc steps back: composer → abilities → GM action', async () => {
    const user = await select('Maga')
    await user.click(await within(detail()).findByRole('button', { name: /Palla di fuoco/ }))
    await user.keyboard('{Escape}')
    expect(
      await within(detail()).findByRole('button', { name: /Palla di fuoco/ }),
    ).toBeInTheDocument()
    await user.keyboard('{Escape}')
    expect(within(detail()).getByRole('heading', { name: 'Azione del GM' })).toBeInTheDocument()
  })
})
