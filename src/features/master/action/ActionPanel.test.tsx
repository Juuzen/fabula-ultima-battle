import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'

import { battleStore } from '@/app/store'
import { createCombatant, createEmptyBattle, type BattleState } from '@/domain'

import { MasterPage } from '../MasterPage'
import { useActionDraft } from './actionDraft'

const battle = () => battleStore.getState().battle
const find = (id: string) => battle().combatants.find((c) => c.id === id)!

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

function setup() {
  const user = userEvent.setup()
  render(<MasterPage />)
  const panel = screen.getByRole('form', { name: 'Azione' })
  return { user, panel }
}

describe('ActionPanel', () => {
  beforeEach(() => {
    localStorage.clear()
    useActionDraft.setState(useActionDraft.getInitialState())
    seed()
  })

  it('performs a multi-target action with MP cost and statuses, as one undo step', async () => {
    const { user, panel } = setup()
    await user.selectOptions(within(panel).getByLabelText('Chi agisce'), 'mage')
    await user.type(within(panel).getByLabelText('Nome azione'), 'Palla di fuoco')
    await user.selectOptions(within(panel).getByLabelText('Effetto'), 'fire')
    await user.type(within(panel).getByLabelText(/Costo PM/), '10')

    await user.click(within(panel).getByRole('checkbox', { name: 'Goblin' }))
    await user.type(within(panel).getByLabelText('Valore per Goblin'), '12')
    await user.click(within(panel).getByRole('checkbox', { name: 'Lupo' }))
    await user.type(within(panel).getByLabelText('Valore per Lupo'), '8')
    await user.click(within(panel).getByRole('button', { name: 'Avvelenato' }))

    await user.click(within(panel).getByRole('button', { name: 'Esegui' }))

    expect(find('mage').mp).toBe(30)
    expect(find('gob')).toMatchObject({ hp: 8, statuses: ['poisoned'] })
    expect(find('wolf')).toMatchObject({ hp: 42, statuses: ['poisoned'] })
    expect(battleStore.getState().past).toHaveLength(1)
    // Amounts are cleared, the rest is kept to repeat a similar action.
    expect(within(panel).getByLabelText('Valore per Goblin')).toHaveValue(null)
    expect(within(panel).getByLabelText('Nome azione')).toHaveValue('Palla di fuoco')
  })

  it('heals or damages MP depending on the chosen type', async () => {
    const { user, panel } = setup()
    await user.selectOptions(within(panel).getByLabelText('Chi agisce'), 'mage')
    await user.click(within(panel).getByRole('radio', { name: 'Danno PM' }))
    await user.click(within(panel).getByRole('checkbox', { name: 'Maga' }))
    await user.type(within(panel).getByLabelText('Valore per Maga'), '5')
    await user.click(within(panel).getByRole('button', { name: 'Esegui' }))
    expect(find('mage')).toMatchObject({ hp: 30, mp: 35 })
  })

  it('explains what is missing and keeps "Esegui" disabled', async () => {
    const { user, panel } = setup()
    const perform = within(panel).getByRole('button', { name: 'Esegui' })
    await user.selectOptions(within(panel).getByLabelText('Chi agisce'), 'mage')
    expect(perform).toBeDisabled()
    expect(panel).toHaveTextContent('Scegli almeno un bersaglio e indica un valore.')

    await user.click(within(panel).getByRole('checkbox', { name: 'Goblin' }))
    await user.type(within(panel).getByLabelText('Valore per Goblin'), '3')
    await user.type(within(panel).getByLabelText(/Costo PM/), '99')
    expect(perform).toBeDisabled()
    expect(panel).toHaveTextContent('PM insufficienti (40 disponibili).')
  })

  it('ignores a leftover MP cost when the new actor has no MP (the field is hidden)', async () => {
    const { user, panel } = setup()
    await user.selectOptions(within(panel).getByLabelText('Chi agisce'), 'mage')
    await user.type(within(panel).getByLabelText(/Costo PM/), '10')
    await user.selectOptions(within(panel).getByLabelText('Chi agisce'), 'gob')
    expect(within(panel).queryByLabelText(/Costo PM/)).not.toBeInTheDocument()

    await user.click(within(panel).getByRole('checkbox', { name: 'Maga' }))
    await user.type(within(panel).getByLabelText('Valore per Maga'), '4')
    await user.click(within(panel).getByRole('button', { name: 'Esegui' }))
    expect(find('mage').hp).toBe(26)
  })

  it('"Agisci" on a combatant card selects it as the actor', async () => {
    const { user, panel } = setup()
    const card = screen.getByRole('listitem', { name: 'Lupo' })
    await user.click(within(card).getByRole('button', { name: 'Agisci' }))
    expect(within(panel).getByLabelText('Chi agisce')).toHaveValue('wolf')
  })

  it('is disabled while preparing the battle', () => {
    seed('preparation')
    const { panel } = setup()
    expect(panel).toHaveTextContent('Inizia la battaglia')
    expect(within(panel).getByLabelText('Chi agisce')).toBeDisabled()
    expect(within(panel).getByRole('button', { name: 'Esegui' })).toBeDisabled()
    const card = screen.getByRole('listitem', { name: 'Lupo' })
    expect(within(card).getByRole('button', { name: 'Agisci' })).toBeDisabled()
  })
})
