import { render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import type { BattleState, Outcome } from '@/domain'

import { demoBattle } from '../demo/demoBattle'
import { PlayerScreen } from '../scene/PlayerScreen'

const ended = (outcome: Outcome): BattleState => ({ ...demoBattle, phase: 'ended', outcome })

describe('OutcomeBanner', () => {
  it('shows nothing while the battle is on', () => {
    render(<PlayerScreen battle={demoBattle} />)
    expect(screen.queryByTestId('outcome-banner')).not.toBeInTheDocument()
  })

  it.each([
    ['victory', 'Vittoria!'],
    ['defeat', 'Sconfitta…'],
    ['flee', 'Fuga!'],
  ] as const)('uses the default words of a %s', (kind, text) => {
    render(<PlayerScreen battle={ended({ kind, text: '' })} />)
    const banner = screen.getByTestId('outcome-banner')
    expect(banner).toHaveAttribute('data-kind', kind)
    expect(banner).toHaveTextContent(text)
  })

  it("shows the GM's own words, over the scene that stays as it was", () => {
    render(<PlayerScreen battle={ended({ kind: 'custom', text: 'Tregua' })} />)
    expect(screen.getByRole('status')).toHaveTextContent('Tregua')
    expect(screen.getByTestId('screen-battle')).toBeInTheDocument()
    // The enemies are still there (in the demo, at least one has its nameplate).
    expect(screen.getAllByTestId(/^nameplate-/).length).toBeGreaterThan(0)
  })

  it('goes back to the waiting screen once the scene ends', async () => {
    const { rerender } = render(<PlayerScreen battle={ended({ kind: 'victory', text: '' })} />)
    rerender(
      <PlayerScreen
        battle={{ ...demoBattle, phase: 'preparation', outcome: null, combatants: [] }}
      />,
    )
    expect(await screen.findByTestId('screen-waiting')).toBeInTheDocument()
    await waitFor(() => expect(screen.queryByTestId('outcome-banner')).not.toBeInTheDocument())
  })
})
