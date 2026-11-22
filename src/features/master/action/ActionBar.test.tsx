import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'

import { battleStore } from '@/app/store'
import { createCombatant, createEmptyBattle, type BattleState } from '@/domain'

import { renderMaster } from '../renderMaster.test-utils'
import { useActionDraft } from './actionDraft'

const battle = () => battleStore.getState().battle
const find = (id: string) => battle().combatants.find((c) => c.id === id)!
const card = (name: string) => screen.getByRole('listitem', { name })
const bar = () => screen.getByRole('form', { name: 'Azione' })

function seed(phase: BattleState['phase'] = 'active') {
  battleStore.setState({
    battle: {
      ...createEmptyBattle(),
      phase,
      combatants: [
        createCombatant({ id: 'mage', name: 'Maga', side: 'ally', maxHp: 30, maxMp: 40 }),
        createCombatant({ id: 'gob', name: 'Goblin', side: 'enemy', maxHp: 20 }),
        createCombatant({ id: 'wolf', name: 'Lupo', side: 'enemy', maxHp: 50 }),
      ],
    },
    past: [],
    lastError: null,
  })
}

async function actAs(name: string) {
  const user = userEvent.setup()
  renderMaster()
  await user.click(within(card(name)).getByRole('button', { name: 'Agisci' }))
  return user
}

describe('action mode', () => {
  beforeEach(() => {
    localStorage.clear()
    useActionDraft.setState(useActionDraft.getInitialState())
    seed()
  })

  it('"Agisci" docks the action bar; the cards become targets', async () => {
    expect(screen.queryByRole('form', { name: 'Azione' })).not.toBeInTheDocument()
    await actAs('Maga')
    expect(within(bar()).getByRole('heading', { name: 'Maga agisce' })).toBeInTheDocument()
    expect(within(bar()).getByLabelText('Nome azione')).toHaveFocus()
    expect(
      within(card('Goblin')).getByRole('button', { name: 'Bersaglio: Goblin' }),
    ).toBeInTheDocument()
    // Quick damage gives way to the target controls while composing.
    expect(within(card('Goblin')).queryByRole('button', { name: 'Danno' })).not.toBeInTheDocument()
  })

  it('performs a multi-target action with MP cost and statuses, as one undo step', async () => {
    const user = await actAs('Maga')
    await user.type(within(bar()).getByLabelText('Nome azione'), 'Palla di fuoco')
    await user.selectOptions(within(bar()).getByLabelText('Effetto'), 'fire')
    await user.type(within(bar()).getByLabelText(/Costo PM/), '10')

    // Typing an amount selects the card as a target.
    await user.type(within(card('Goblin')).getByLabelText('Valore per Goblin'), '12')
    expect(
      within(card('Goblin')).getByRole('button', { name: 'Bersaglio: Goblin' }),
    ).toHaveAttribute('aria-pressed', 'true')
    await user.click(within(card('Lupo')).getByRole('button', { name: 'Bersaglio: Lupo' }))
    await user.type(within(card('Lupo')).getByLabelText('Valore per Lupo'), '8')
    await user.click(within(bar()).getByRole('button', { name: 'Avvelenato' }))
    expect(bar()).toHaveTextContent('2 bersagli')

    await user.click(within(bar()).getByRole('button', { name: 'Esegui' }))

    expect(find('mage').mp).toBe(30)
    expect(find('gob')).toMatchObject({ hp: 8, statuses: ['poisoned'] })
    expect(find('wolf')).toMatchObject({ hp: 42, statuses: ['poisoned'] })
    expect(battleStore.getState().past).toHaveLength(1)
    // Done: back to the normal cards.
    expect(screen.queryByRole('form', { name: 'Azione' })).not.toBeInTheDocument()
    expect(within(card('Goblin')).getByRole('button', { name: 'Danno' })).toBeInTheDocument()
  })

  it('Enter in a target amount runs the action', async () => {
    const user = await actAs('Maga')
    await user.type(within(card('Goblin')).getByLabelText('Valore per Goblin'), '5{Enter}')
    expect(find('gob').hp).toBe(15)
  })

  it('heals or damages MP depending on the chosen type', async () => {
    const user = await actAs('Maga')
    await user.click(within(bar()).getByRole('radio', { name: 'Danno PM' }))
    await user.type(within(card('Maga')).getByLabelText('Valore per Maga'), '5')
    await user.click(within(bar()).getByRole('button', { name: 'Esegui' }))
    expect(find('mage')).toMatchObject({ hp: 30, mp: 35 })
  })

  it('explains what is missing and keeps "Esegui" disabled', async () => {
    const user = await actAs('Maga')
    const perform = within(bar()).getByRole('button', { name: 'Esegui' })
    expect(perform).toBeDisabled()
    expect(bar()).toHaveTextContent('Scegli i bersagli sulle card e scrivi gli importi.')

    await user.type(within(card('Goblin')).getByLabelText('Valore per Goblin'), '3')
    await user.type(within(bar()).getByLabelText(/Costo PM/), '99')
    expect(perform).toBeDisabled()
    expect(bar()).toHaveTextContent('PM insufficienti (40 disponibili).')
  })

  it('an actor without MP has no MP cost field', async () => {
    await actAs('Goblin')
    expect(within(bar()).queryByLabelText(/Costo PM/)).not.toBeInTheDocument()
  })

  it('Esc, Esci or "Agisci" again leave action mode without acting', async () => {
    const user = await actAs('Lupo')
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('form', { name: 'Azione' })).not.toBeInTheDocument()

    await user.click(within(card('Lupo')).getByRole('button', { name: 'Agisci' }))
    await user.click(within(bar()).getByRole('button', { name: 'Esci' }))
    expect(screen.queryByRole('form', { name: 'Azione' })).not.toBeInTheDocument()

    await user.click(within(card('Lupo')).getByRole('button', { name: 'Agisci' }))
    await user.click(within(card('Lupo')).getByRole('button', { name: 'Agisci' }))
    expect(screen.queryByRole('form', { name: 'Azione' })).not.toBeInTheDocument()
    expect(battleStore.getState().past).toHaveLength(0)
  })

  it('"Agisci" is disabled while preparing the battle', () => {
    seed('preparation')
    renderMaster()
    expect(within(card('Lupo')).getByRole('button', { name: 'Agisci' })).toBeDisabled()
  })
})
