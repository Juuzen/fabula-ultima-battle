import { act, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'

import { battleStore } from '@/app/store'
import { startDisplaySync } from '@/app/sync/displaySync'
import { SYNC_CHANNEL_NAME } from '@/app/sync/protocol'
import { createCombatant, createEmptyBattle, type BattleState } from '@/domain'
import { createBroadcastChannelTransport } from '@/infra/sync/broadcastChannelTransport'

import { MasterPage } from './MasterPage'

const battle = () => battleStore.getState().battle
const find = (id: string) => battle().combatants.find((c) => c.id === id)

function seed(state: Partial<BattleState> = {}) {
  battleStore.setState({
    battle: {
      ...createEmptyBattle(),
      combatants: [
        createCombatant({ id: 'hero', name: 'Lyra', side: 'ally', maxHp: 40, maxMp: 30 }),
        createCombatant({ id: 'orc', name: 'Orco', side: 'enemy', maxHp: 50 }),
      ],
      ...state,
    },
    past: [],
    lastError: null,
  })
}

function setup() {
  const user = userEvent.setup()
  render(<MasterPage />)
  return user
}

const card = (name: string) => screen.getByRole('listitem', { name })

describe('MasterPage', () => {
  beforeEach(() => {
    localStorage.clear()
    seed()
  })

  describe('roster', () => {
    it('adds a combatant at full HP, MP defaulting to 0', async () => {
      const user = setup()
      const enemies = screen.getByRole('region', { name: 'Nemici' })
      const form = within(enemies).getByRole('form', { name: 'Aggiungi' })

      await user.type(within(form).getByLabelText('Nome'), 'Goblin')
      await user.type(within(form).getByLabelText('PV max'), '20')
      await user.click(within(form).getByRole('button', { name: 'Aggiungi' }))

      const goblin = battle().combatants.find((c) => c.name === 'Goblin')
      expect(goblin).toMatchObject({ side: 'enemy', hp: 20, maxHp: 20, maxMp: 0 })
      expect(card('Goblin')).toBeInTheDocument()
      // Name is cleared for the next one, stats are kept.
      expect(within(form).getByLabelText('Nome')).toHaveValue('')
      expect(within(form).getByLabelText('PV max')).toHaveValue(20)
    })

    it('applies damage, heal and MP with the amount field', async () => {
      const user = setup()
      const hero = card('Lyra')
      await user.type(within(hero).getByLabelText('Valore'), '25')
      await user.click(within(hero).getByRole('button', { name: 'Danno' }))
      expect(find('hero')?.hp).toBe(15)

      await user.click(within(hero).getByRole('button', { name: 'Cura' }))
      expect(find('hero')?.hp).toBe(40)

      await user.click(within(hero).getByRole('button', { name: /− PM/ }))
      expect(find('hero')?.mp).toBe(5)
    })

    it('Enter applies damage and Shift+Enter heals', async () => {
      const user = setup()
      const field = within(card('Orco')).getByLabelText('Valore')
      await user.type(field, '10{Enter}')
      expect(find('orc')?.hp).toBe(40)
      await user.keyboard('{Shift>}{Enter}{/Shift}')
      expect(find('orc')?.hp).toBe(50)
    })

    it('disables actions until a positive amount is typed', () => {
      setup()
      expect(within(card('Lyra')).getByRole('button', { name: 'Danno' })).toBeDisabled()
    })

    it('hides MP buttons for combatants without MP', () => {
      setup()
      expect(within(card('Orco')).queryByRole('button', { name: /PM/ })).not.toBeInTheDocument()
    })

    it('toggles statuses', async () => {
      const user = setup()
      const slow = within(card('Lyra')).getByRole('button', { name: 'Lento' })
      expect(slow).toHaveAttribute('aria-pressed', 'false')
      await user.click(slow)
      expect(find('hero')?.statuses).toEqual(['slow'])
      expect(slow).toHaveAttribute('aria-pressed', 'true')
    })

    it('edits a combatant in one undoable step', async () => {
      const user = setup()
      await user.click(within(card('Lyra')).getByRole('button', { name: 'Modifica' }))
      const form = screen.getByRole('form', { name: 'Modifica Lyra' })
      const name = within(form).getByLabelText('Nome')
      await user.clear(name)
      await user.type(name, 'Lyra la Saggia')
      const hp = within(form).getByLabelText('PV attuali')
      await user.clear(hp)
      await user.type(hp, '12')
      await user.click(within(form).getByRole('button', { name: 'Salva' }))

      expect(find('hero')).toMatchObject({ name: 'Lyra la Saggia', hp: 12 })
      expect(battleStore.getState().past).toHaveLength(1)
    })

    it('reorders within a side', async () => {
      seed({
        combatants: [
          createCombatant({ id: 'a', name: 'Alfa', side: 'ally', maxHp: 10 }),
          createCombatant({ id: 'b', name: 'Beta', side: 'ally', maxHp: 10 }),
        ],
      })
      const user = setup()
      await user.click(within(card('Beta')).getByRole('button', { name: 'Sposta su' }))
      expect(battle().combatants.map((c) => c.id)).toEqual(['b', 'a'])
    })

    it('removes, then undo brings the combatant back (button and Ctrl+Z)', async () => {
      const user = setup()
      await user.click(within(card('Orco')).getByRole('button', { name: 'Rimuovi' }))
      expect(find('orc')).toBeUndefined()

      await user.click(screen.getByRole('button', { name: 'Annulla ultima azione' }))
      expect(find('orc')).toBeDefined()

      await user.click(within(card('Orco')).getByRole('button', { name: 'Rimuovi' }))
      await user.keyboard('{Control>}z{/Control}')
      expect(find('orc')).toBeDefined()
    })
  })

  describe('enemy visibility', () => {
    it('reveals a single enemy, and "reveal all" overrides it', async () => {
      const user = setup()
      const reveal = within(card('Orco')).getByRole('switch', { name: /PV\/PM visibili/ })
      await user.click(reveal)
      expect(find('orc')?.revealStats).toBe(true)

      await user.click(screen.getByRole('switch', { name: 'Mostra PV/PM di tutti i nemici' }))
      expect(battle().presentation.revealAllEnemyStats).toBe(true)
      expect(reveal).toBeDisabled()
    })

    it('switches mode and shows/hides the window', async () => {
      const user = setup()
      const panel = screen.getByRole('region', { name: 'Finestra nemici' })
      await user.click(within(panel).getByRole('radio', { name: 'Manuale' }))
      expect(battle().presentation.enemyPanel.mode).toBe('manual')
      expect(within(panel).queryByLabelText('Nascondi dopo (secondi)')).not.toBeInTheDocument()

      await user.click(within(panel).getByRole('button', { name: 'Mostra' }))
      expect(battle().presentation.enemyPanel.visible).toBe(true)
      await user.click(within(panel).getByRole('button', { name: 'Nascondi' }))
      expect(battle().presentation.enemyPanel.visible).toBe(false)
    })

    it('commits the auto-hide delay on blur and reverts invalid values', async () => {
      const user = setup()
      const field = screen.getByLabelText('Nascondi dopo (secondi)')
      await user.clear(field)
      await user.type(field, '10')
      await user.tab()
      expect(battle().presentation.enemyPanel.autoHideSeconds).toBe(10)

      await user.clear(field)
      await user.type(field, '0')
      await user.tab()
      expect(battle().presentation.enemyPanel.autoHideSeconds).toBe(10)
      expect(field).toHaveValue(10)
    })
  })

  describe('battle', () => {
    it('starts in preparation: enemies are hidden from players until "Inizia battaglia"', async () => {
      const user = setup()
      expect(screen.getByTestId('battle-phase')).toHaveTextContent('In preparazione')
      expect(screen.getByText('Nascosti ai giocatori')).toBeInTheDocument()
      const preview = screen.getByRole('region', { name: 'Anteprima schermo giocatori' })
      expect(within(preview).getByTestId('waiting-screen')).toHaveTextContent(
        'In attesa della battaglia…',
      )
      expect(within(preview).queryByTestId('party-slot-hero')).not.toBeInTheDocument()

      await user.click(screen.getByRole('button', { name: 'Inizia battaglia' }))
      expect(battle().phase).toBe('active')
      expect(screen.getByTestId('battle-phase')).toHaveTextContent('In corso')
      expect(screen.queryByText('Nascosti ai giocatori')).not.toBeInTheDocument()
      expect(within(preview).queryByTestId('waiting-screen')).not.toBeInTheDocument()
      expect(within(preview).getByTestId('party-slot-hero')).toBeInTheDocument()
      expect(within(preview).getByTestId('nameplate-orc')).toBeInTheDocument()
    })

    it('cannot start a battle without enemies', () => {
      seed({ combatants: [createCombatant({ id: 'a', name: 'Solo', side: 'ally', maxHp: 10 })] })
      setup()
      expect(screen.getByRole('button', { name: 'Inizia battaglia' })).toBeDisabled()
    })

    it('ends the battle only after confirmation, back to preparation', async () => {
      seed({ phase: 'active' })
      const user = setup()
      await user.click(screen.getByRole('button', { name: 'Termina battaglia' }))
      expect(find('orc')).toBeDefined()

      await user.click(screen.getByRole('button', { name: 'Conferma: rimuovi tutti i nemici' }))
      expect(find('orc')).toBeUndefined()
      expect(find('hero')).toBeDefined()
      expect(battle().phase).toBe('preparation')
      expect(screen.getByRole('button', { name: 'Inizia battaglia' })).toBeDisabled()
    })

    it('renames the battle on blur', async () => {
      const user = setup()
      await user.type(screen.getByLabelText('Nome battaglia'), 'Agguato')
      expect(battle().name).toBe('')
      await user.tab()
      expect(battle().name).toBe('Agguato')
    })

    it('shows domain errors in Italian and lets the GM dismiss them', async () => {
      const user = setup()
      act(() => {
        battleStore.getState().dispatch({ type: 'DAMAGE', id: 'ghost', amount: 1 })
      })
      expect(screen.getByRole('alert')).toHaveTextContent('Combattente non trovato.')
      await user.click(screen.getByRole('button', { name: 'Chiudi' }))
      expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    })
  })

  it('shows when a player screen is connected (real BroadcastChannel)', async () => {
    setup()
    expect(screen.getByTestId('display-connection')).toHaveTextContent('non collegato')

    const transport = createBroadcastChannelTransport(SYNC_CHANNEL_NAME)
    const received: string[] = []
    const stop = startDisplaySync({ transport, onState: (state) => received.push(state.name) })
    expect(await screen.findByText('Schermo giocatori collegato')).toBeInTheDocument()
    await waitFor(() => expect(received.length).toBeGreaterThan(0))

    stop()
    transport.close()
    expect(await screen.findByText('Schermo giocatori non collegato')).toBeInTheDocument()
  })

  it('renders a live preview of the player screen', () => {
    seed({ phase: 'active' })
    setup()
    const preview = screen.getByRole('region', { name: 'Anteprima schermo giocatori' })
    expect(within(preview).getByTestId('party-slot-hero')).toBeInTheDocument()
  })
})
