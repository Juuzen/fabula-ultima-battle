import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { createCombatant, createEmptyBattle, type BattleState } from '@/domain'
import { AssetResolverProvider } from '@/infra/assets/AssetResolverProvider'

import { demoBattle } from '../demo/demoBattle'
import { BattleScene } from './BattleScene'

describe('BattleScene', () => {
  it('shows ally HP numbers and Crisis / KO tags in the party window', () => {
    render(<BattleScene battle={demoBattle} />)
    const party = screen.getByRole('region', { name: 'Party' })

    const lyra = within(party).getByTestId('party-row-a1')
    expect(lyra).toHaveTextContent('Lyra')
    expect(lyra).toHaveTextContent('48 / 62')

    expect(within(party).getByTestId('party-row-a2')).toHaveTextContent('Crisi')
    expect(within(party).getByTestId('party-row-a3')).toHaveTextContent('KO')
    expect(within(party).getByTestId('party-row-a4')).toHaveTextContent('Lento')
  })

  it('hides exact enemy HP from players', () => {
    render(<BattleScene battle={demoBattle} />)
    const enemies = screen.getByRole('region', { name: 'Nemici' })
    const shaman = within(enemies).getByTestId('enemy-row-e2')
    expect(shaman).toHaveTextContent('Goblin Sciamano')
    expect(shaman).toHaveTextContent('Crisi')
    expect(shaman).not.toHaveTextContent('12')
  })

  it('marks sprite states for styling', () => {
    render(<BattleScene battle={demoBattle} />)
    expect(screen.getByTestId('sprite-a1')).toHaveAttribute('data-state', 'ok')
    expect(screen.getByTestId('sprite-a2')).toHaveAttribute('data-state', 'crisis')
    expect(screen.getByTestId('sprite-a3')).toHaveAttribute('data-state', 'ko')
  })

  it('omits a window when its side is empty', () => {
    const onlyAllies: BattleState = {
      ...createEmptyBattle(),
      combatants: [createCombatant({ id: 'a', name: 'Solo', side: 'ally', maxHp: 10 })],
    }
    render(<BattleScene battle={onlyAllies} />)
    expect(screen.queryByRole('region', { name: 'Nemici' })).not.toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Party' })).toBeInTheDocument()
  })

  it('renders resolved assets for background and sprites, mirroring when asked', () => {
    const battle: BattleState = {
      name: '',
      backgroundAssetId: 'bg',
      combatants: [
        createCombatant({
          id: 'x',
          name: 'Drake',
          side: 'enemy',
          maxHp: 10,
          spriteAssetId: 'drake',
          flipSprite: true,
        }),
      ],
    }
    const { container } = render(
      <AssetResolverProvider resolver={(id) => `blob:${id}`}>
        <BattleScene battle={battle} />
      </AssetResolverProvider>,
    )
    expect(screen.queryByTestId('default-backdrop')).not.toBeInTheDocument()
    const sources = [...container.querySelectorAll('img')].map((img) => img.getAttribute('src'))
    expect(sources).toEqual(['blob:bg', 'blob:drake'])
    const sprite = screen.getByTestId('sprite-x').querySelector('img')!.parentElement!
    expect(sprite.style.transform).toBe('scaleX(-1)')
  })
})
