import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { createEmptyBattle, type BattleState } from '@/domain'
import { AssetResolverProvider } from '@/infra/assets/AssetResolverProvider'

import { demoBattle } from '../demo/demoBattle'
import { PlayerScreen } from './PlayerScreen'

describe('PlayerScreen', () => {
  it('shows the waiting screen with the built-in background while preparing', () => {
    render(<PlayerScreen battle={createEmptyBattle()} />)
    expect(screen.getByTestId('waiting-screen')).toHaveTextContent('In attesa della battaglia…')
    expect(screen.getByTestId('default-waiting-backdrop')).toBeInTheDocument()
  })

  it('uses the background chosen by the GM', () => {
    const base = createEmptyBattle()
    const battle: BattleState = {
      ...base,
      presentation: { ...base.presentation, waitingBackgroundAssetId: 'tavern' },
    }
    const { container } = render(
      <AssetResolverProvider resolver={(id) => `blob:${id}`}>
        <PlayerScreen battle={battle} />
      </AssetResolverProvider>,
    )
    expect(screen.queryByTestId('default-waiting-backdrop')).not.toBeInTheDocument()
    expect(container.querySelector('img')?.getAttribute('src')).toBe('blob:tavern')
  })

  it('shows the battle once it has started', () => {
    render(<PlayerScreen battle={demoBattle} />)
    expect(screen.queryByTestId('waiting-screen')).not.toBeInTheDocument()
    expect(screen.getByTestId('party-slot-a1')).toBeInTheDocument()
  })
})
