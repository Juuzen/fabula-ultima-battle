import { act, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'

import { battleStore } from '@/app/store'
import { startDisplaySync } from '@/app/sync/displaySync'
import { SYNC_CHANNEL_NAME } from '@/app/sync/protocol'
import { createCombatant, createEmptyBattle, type BattleState } from '@/domain'
import { createBroadcastChannelTransport } from '@/infra/sync/broadcastChannelTransport'

import { useActionDraft } from './action/actionDraft'
import { usePreviewWindow } from './preview/previewWindowStore'
import { renderMaster } from './renderMaster.test-utils'

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
    lastError: null,
  })
}

function setup() {
  const user = userEvent.setup()
  renderMaster()
  return user
}

const card = (name: string) => screen.getByRole('listitem', { name })
const field = () => screen.getByRole('region', { name: 'Campo' })

/** Card commands live in the "⋯" menu. */
async function fromMenu(user: ReturnType<typeof userEvent.setup>, name: string, item: string) {
  await user.click(within(card(name)).getByRole('button', { name: `Altre azioni di ${name}` }))
  await user.click(screen.getByRole('menuitem', { name: item }))
}

describe('Screen Control', () => {
  beforeEach(() => {
    localStorage.clear()
    useActionDraft.setState(useActionDraft.getInitialState())
    usePreviewWindow.setState(usePreviewWindow.getInitialState())
    seed()
  })

  describe('field', () => {
    it('shows compact cards without actions on them, party then enemies', () => {
      setup()
      const hero = card('Lyra')
      expect(within(hero).getByRole('button', { name: 'Lyra' })).toHaveAttribute(
        'aria-pressed',
        'false',
      )
      expect(within(hero).queryByRole('button', { name: /Danno|Cura|Agisci/ })).toBeNull()
      expect(within(hero).getByRole('meter', { name: 'PV' })).toHaveAttribute('aria-valuenow', '40')
      expect(within(hero).getByRole('meter', { name: 'PM' })).toHaveAttribute('aria-valuenow', '30')
      expect(within(card('Orco')).queryByRole('meter', { name: 'PM' })).not.toBeInTheDocument()
    })

    it('adds an improvised combatant from the Schiera popover', async () => {
      const user = setup()
      await user.click(within(field()).getByRole('button', { name: 'Schiera' }))
      await user.click(screen.getByRole('tab', { name: 'Al volo' }))
      const form = screen.getByRole('form', { name: 'Aggiungi' })
      await user.type(within(form).getByLabelText('Nome'), 'Goblin')
      await user.type(within(form).getByLabelText('PV max'), '20')
      await user.click(within(form).getByRole('button', { name: 'Aggiungi' }))

      expect(battle().combatants.find((c) => c.name === 'Goblin')).toMatchObject({
        side: 'enemy',
        hp: 20,
        maxMp: 0,
      })
      expect(card('Goblin')).toBeInTheDocument()
      // The popover stays open for the next one.
      expect(within(form).getByLabelText('Nome')).toHaveValue('')
    })

    it('reorders within a side', async () => {
      seed({
        combatants: [
          createCombatant({ id: 'a', name: 'Alfa', side: 'ally', maxHp: 10 }),
          createCombatant({ id: 'b', name: 'Beta', side: 'ally', maxHp: 10 }),
        ],
      })
      const user = setup()
      await fromMenu(user, 'Beta', 'Sposta su')
      expect(battle().combatants.map((c) => c.id)).toEqual(['b', 'a'])
    })

    it('removes a combatant only after confirmation', async () => {
      const user = setup()
      await fromMenu(user, 'Orco', 'Rimuovi dalla battaglia…')
      expect(find('orc')).toBeDefined()
      const confirm = screen.getByRole('alertdialog', { name: 'Rimuovere Orco dalla battaglia?' })
      await user.click(within(confirm).getByRole('button', { name: 'Annulla' }))
      expect(find('orc')).toBeDefined()

      await fromMenu(user, 'Orco', 'Rimuovi dalla battaglia…')
      await user.click(screen.getByRole('button', { name: 'Rimuovi' }))
      expect(find('orc')).toBeUndefined()
    })

    it('reveals a single enemy from its menu; "reveal all" overrides it', async () => {
      const user = setup()
      await fromMenu(user, 'Orco', 'Mostra PV/PM ai giocatori')
      expect(find('orc')?.revealStats).toBe(true)
      expect(within(card('Orco')).getByLabelText('PV/PM visibili ai giocatori')).toBeInTheDocument()

      await user.click(screen.getByRole('button', { name: 'Impostazioni schermo' }))
      await user.click(screen.getByRole('switch', { name: 'Mostra PV/PM di tutti i nemici' }))
      expect(battle().presentation.revealAllEnemyStats).toBe(true)
      await user.keyboard('{Escape}')
      await user.click(within(card('Orco')).getByRole('button', { name: 'Altre azioni di Orco' }))
      expect(screen.getByRole('menuitem', { name: 'Nascondi PV/PM ai giocatori' })).toBeDisabled()
    })
  })

  describe('selection', () => {
    it('clicking a card selects it; again (or Esc) goes back to the GM action', async () => {
      const user = setup()
      expect(screen.getByRole('heading', { name: 'Azione del GM' })).toBeInTheDocument()

      const lyra = within(card('Lyra')).getByRole('button', { name: 'Lyra' })
      await user.click(lyra)
      expect(lyra).toHaveAttribute('aria-pressed', 'true')
      const detail = screen.getByRole('region', { name: 'Dettaglio' })
      expect(within(detail).getByRole('heading', { name: 'Lyra' })).toBeInTheDocument()
      expect(within(detail).getByRole('button', { name: /Azione libera/ })).toBeInTheDocument()

      await user.click(lyra)
      expect(screen.getByRole('heading', { name: 'Azione del GM' })).toBeInTheDocument()

      await user.click(lyra)
      await user.keyboard('{Escape}')
      expect(lyra).toHaveAttribute('aria-pressed', 'false')
    })

    it('a removed selected combatant hands the detail back to the GM', async () => {
      const user = setup()
      await user.click(within(card('Orco')).getByRole('button', { name: 'Orco' }))
      act(() => {
        battleStore.getState().dispatch({ type: 'REMOVE_COMBATANT', id: 'orc' })
      })
      expect(await screen.findByRole('heading', { name: 'Azione del GM' })).toBeInTheDocument()
    })
  })

  describe('screen settings', () => {
    it('shows and hides the enemy window from the page bar', async () => {
      const user = setup()
      await user.click(screen.getByRole('button', { name: 'Mostra finestra nemici' }))
      expect(battle().presentation.enemyPanel.visible).toBe(true)
      await user.click(screen.getByRole('button', { name: 'Nascondi finestra nemici' }))
      expect(battle().presentation.enemyPanel.visible).toBe(false)
    })

    it('keeps mode and auto-hide delay in the settings popover', async () => {
      const user = setup()
      await user.click(screen.getByRole('button', { name: 'Impostazioni schermo' }))
      const panel = screen.getByRole('dialog', { name: 'Impostazioni schermo' })
      const delay = within(panel).getByLabelText('Nascondi dopo (secondi)')
      await user.clear(delay)
      await user.type(delay, '10')
      await user.tab()
      expect(battle().presentation.enemyPanel.autoHideSeconds).toBe(10)
      await user.clear(delay)
      await user.type(delay, '0')
      await user.tab()
      expect(battle().presentation.enemyPanel.autoHideSeconds).toBe(10)
      expect(delay).toHaveValue(10)

      await user.click(within(panel).getByRole('radio', { name: 'Manuale' }))
      expect(battle().presentation.enemyPanel.mode).toBe('manual')
      expect(within(panel).queryByLabelText('Nascondi dopo (secondi)')).not.toBeInTheDocument()

      await user.keyboard('{Escape}')
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Impostazioni schermo' })).toHaveFocus()
    })
  })

  describe('battle', () => {
    it('starts in preparation: enemies are hidden from players until "Inizia battaglia"', async () => {
      const user = setup()
      expect(screen.getByTestId('battle-phase')).toHaveAttribute('data-phase', 'preparation')
      expect(screen.getByText('Nascosti ai giocatori')).toBeInTheDocument()
      const preview = screen.getByRole('region', { name: 'Schermo giocatori' })
      expect(within(preview).getByTestId('waiting-screen')).toHaveTextContent(
        'In attesa della battaglia…',
      )
      expect(within(preview).queryByTestId('party-slot-hero')).not.toBeInTheDocument()

      await user.click(screen.getByRole('button', { name: 'Inizia battaglia' }))
      expect(battle().phase).toBe('active')
      expect(screen.queryByText('Nascosti ai giocatori')).not.toBeInTheDocument()
      expect(within(preview).getByTestId('party-slot-hero')).toBeInTheDocument()
      expect(within(preview).getByTestId('nameplate-orc')).toBeInTheDocument()
    })

    it('cannot start a battle without enemies', () => {
      seed({ combatants: [createCombatant({ id: 'a', name: 'Solo', side: 'ally', maxHp: 10 })] })
      setup()
      expect(screen.getByRole('button', { name: 'Inizia battaglia' })).toBeDisabled()
    })

    it('ends the battle only after confirmation; the empty field shows the deploy tabs', async () => {
      seed({ phase: 'active' })
      const user = setup()
      await user.click(screen.getByRole('button', { name: 'Termina battaglia' }))
      expect(find('orc')).toBeDefined()

      await user.click(screen.getByRole('button', { name: 'Conferma: termina la scena' }))
      expect(battle().combatants).toEqual([])
      expect(battle().phase).toBe('preparation')
      expect(within(field()).getByRole('tablist', { name: 'Schiera' })).toBeInTheDocument()
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

  it('shows the live badge in the sidebar while the battle runs', async () => {
    const user = setup()
    const nav = screen.getByRole('navigation', { name: 'Sezioni della plancia' })
    expect(within(nav).queryByText('In corso')).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Inizia battaglia' }))
    expect(within(nav).getByText('In corso')).toBeInTheDocument()
  })

  it('lists the keyboard shortcuts on "?" (not while typing) and closes on Escape', async () => {
    const user = setup()
    const title = () => screen.queryByRole('heading', { name: 'Scorciatoie da tastiera' })
    await user.type(screen.getByLabelText('Nome (facoltativo)'), '?')
    expect(title()).not.toBeInTheDocument()

    await user.click(document.body)
    await user.keyboard('?')
    expect(title()).toBeInTheDocument()
    expect(screen.getByText("Agisci (da un campo dell'azione)")).toBeInTheDocument()
    await user.keyboard('{Escape}')
    expect(title()).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Scorciatoie' })).toHaveFocus()
  })

  describe('floating preview', () => {
    it('renders the player screen live; the strip button closes and reopens it', async () => {
      seed({ phase: 'active' })
      const user = setup()
      const preview = screen.getByRole('region', { name: 'Schermo giocatori' })
      expect(within(preview).getByTestId('party-slot-hero')).toBeInTheDocument()

      const toggle = screen.getByRole('button', { name: 'Anteprima' })
      expect(toggle).toHaveAttribute('aria-pressed', 'true')
      await user.click(toggle)
      expect(screen.queryByRole('region', { name: 'Schermo giocatori' })).not.toBeInTheDocument()
      await user.click(toggle)
      expect(screen.getByRole('region', { name: 'Schermo giocatori' })).toBeInTheDocument()
    })

    it('rolls up to its title bar and moves with the arrow keys, remembering where', async () => {
      const user = setup()
      const preview = screen.getByRole('region', { name: 'Schermo giocatori' })
      await user.click(within(preview).getByRole('button', { name: 'Riduci' }))
      expect(within(preview).queryByTestId('waiting-screen')).not.toBeInTheDocument()
      await user.click(within(preview).getByRole('button', { name: 'Espandi' }))

      const bar = within(preview).getByRole('button', { name: "Sposta l'anteprima" })
      bar.focus()
      await user.keyboard('{ArrowLeft}{ArrowUp}')
      const moved = usePreviewWindow.getState().position
      expect(moved).not.toBeNull()
      await user.keyboard('{ArrowRight}')
      expect(usePreviewWindow.getState().position?.x).toBe(moved!.x + 16)
      expect(JSON.parse(localStorage.getItem('fu-battle.preview-window')!).state.position).toEqual(
        usePreviewWindow.getState().position,
      )
    })
  })
})
