import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'

import { library } from '@/app/library/library'
import { battleStore } from '@/app/store'
import { createEmptyBattle, createUnit, type BattleScene } from '@/domain'

import { useActionDraft } from '../action/actionDraft'
import { renderMaster } from '../renderMaster.test-utils'

const battle = () => battleStore.getState().battle
const names = (side: 'ally' | 'enemy') =>
  battle()
    .combatants.filter((c) => c.side === side)
    .map((c) => c.name)

const lyra = createUnit({
  id: 'lyra',
  kind: 'party',
  name: 'Lyra',
  maxHp: 40,
  maxMp: 30,
  hp: 18,
  mp: 6,
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
  ],
})
const bastian = createUnit({ id: 'bastian', kind: 'party', name: 'Bastian', maxHp: 60 })
const goblin = createUnit({ id: 'gob', kind: 'enemy', name: 'Goblin', maxHp: 20 })

const scene: BattleScene = {
  id: 'porto',
  name: 'Agguato al porto',
  partyUnitIds: ['lyra'],
  enemies: [{ unitId: 'gob', count: 2 }],
  backgroundAssetId: null,
  musicAssetId: null,
  updatedAt: 0,
}

describe('Deploy panel', () => {
  beforeEach(async () => {
    localStorage.clear()
    useActionDraft.setState(useActionDraft.getInitialState())
    battleStore.setState({ battle: createEmptyBattle(), past: [], lastError: null })
    await library.db.units.clear()
    await library.db.scenes.clear()
    await Promise.all([lyra, bastian, goblin].map((u) => library.saveUnit(u)))
    await library.saveScene(scene)
  })

  it('is open while the field is empty and loads a scene as one undo step', async () => {
    const user = userEvent.setup()
    renderMaster()
    const row = await screen.findByText('Agguato al porto')
    await user.click(within(row.closest('li')!).getByRole('button', { name: 'Carica' }))

    await waitFor(() => expect(battle().name).toBe('Agguato al porto'))
    expect(names('ally')).toEqual(['Lyra'])
    expect(names('enemy')).toEqual(['Goblin 1', 'Goblin 2'])
    expect(battle().combatants[0]).toMatchObject({ hp: 18, mp: 6, unitId: 'lyra' })
    expect(battle().phase).toBe('preparation')
    expect(screen.getByRole('button', { name: 'Annulla: Scena: Agguato al porto' })).toBeEnabled()
  })

  it('asks before replacing a field that is in use', async () => {
    const user = userEvent.setup()
    renderMaster()
    await user.click(await screen.findByRole('tab', { name: 'Party' }))
    await user.click(await screen.findByRole('button', { name: 'Schiera Bastian' }))
    await user.click(screen.getByRole('tab', { name: 'Scena' }))
    const row = (await screen.findByText('Agguato al porto')).closest('li')!
    await user.click(within(row).getByRole('button', { name: 'Carica' }))
    expect(names('ally')).toEqual(['Bastian'])

    await user.click(within(row).getByRole('button', { name: 'Conferma: sostituisci il campo' }))
    await waitFor(() => expect(names('ally')).toEqual(['Lyra']))
  })

  it('deploys party members once each, then the rest in one go', async () => {
    const user = userEvent.setup()
    renderMaster()
    await user.click(await screen.findByRole('tab', { name: 'Party' }))
    await user.click(await screen.findByRole('button', { name: 'Schiera Lyra' }))
    expect(names('ally')).toEqual(['Lyra'])
    expect(screen.queryByRole('button', { name: 'Schiera Lyra' })).not.toBeInTheDocument()
    expect(screen.getByText('In campo')).toBeInTheDocument()

    battleStore.setState({ battle: createEmptyBattle(), past: [], lastError: null })
    await user.click(await screen.findByRole('button', { name: 'Schiera tutto il party' }))
    expect(names('ally')).toEqual(['Bastian', 'Lyra'])
  })

  it('deploys enemies ×N, continuing the numbering already on the field', async () => {
    const user = userEvent.setup()
    renderMaster()
    await user.click(await screen.findByRole('tab', { name: 'Nemici' }))
    await user.click(await screen.findByRole('button', { name: 'Uno in più: Goblin' }))
    await user.click(screen.getByRole('button', { name: 'Uno in più: Goblin' }))
    await user.click(screen.getByRole('button', { name: 'Schiera ×3 Goblin' }))
    expect(names('enemy')).toEqual(['Goblin 1', 'Goblin 2', 'Goblin 3'])
    expect(battleStore.getState().past).toHaveLength(1)

    await user.click(screen.getByRole('button', { name: 'Uno in meno: Goblin' }))
    await user.click(screen.getByRole('button', { name: 'Uno in meno: Goblin' }))
    await user.click(screen.getByRole('button', { name: 'Schiera ×1 Goblin' }))
    expect(names('enemy')).toEqual(['Goblin 1', 'Goblin 2', 'Goblin 3', 'Goblin 4'])
  })

  it('ability picker prefills the action; MP cost and amount stay hints', async () => {
    const user = userEvent.setup()
    renderMaster()
    await user.click(await screen.findByRole('button', { name: 'Carica' }))
    await waitFor(() => expect(names('ally')).toEqual(['Lyra']))
    await user.click(screen.getByRole('button', { name: 'Inizia battaglia' }))

    const lyraCard = screen.getByRole('listitem', { name: 'Lyra' })
    await user.click(within(lyraCard).getByRole('button', { name: 'Agisci' }))
    const panel = screen.getByRole('form', { name: 'Azione' })
    const ability = await within(panel).findByLabelText('Abilità')
    await user.selectOptions(ability, 'Palla di fuoco')

    expect(within(panel).getByLabelText('Nome azione')).toHaveValue('Palla di fuoco')
    expect(within(panel).getByLabelText('Effetto')).toHaveValue('fire')
    expect(within(panel).getByRole('button', { name: 'Scosso' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    const mpCost = within(panel).getByLabelText(/Costo PM/)
    expect(mpCost).toHaveValue(null)
    expect(mpCost).toHaveAttribute('placeholder', 'promemoria: 10')

    const goblinCard = screen.getByRole('listitem', { name: 'Goblin 1' })
    await user.click(within(goblinCard).getByRole('button', { name: 'Bersaglio: Goblin 1' }))
    const amount = within(goblinCard).getByLabelText('Valore per Goblin 1')
    expect(amount).toHaveValue(null)
    expect(amount).toHaveAttribute('placeholder', '25')

    await user.selectOptions(ability, 'Azione libera')
    expect(mpCost).not.toHaveAttribute('placeholder')
  })
})
