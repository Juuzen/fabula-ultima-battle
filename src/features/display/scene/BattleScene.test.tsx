import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { createCombatant, createEmptyBattle, type BattleState } from '@/domain'
import { AssetResolverProvider } from '@/infra/assets/AssetResolverProvider'

import { demoBattle } from '../demo/demoBattle'
import { BattleScene } from './BattleScene'

describe('BattleScene', () => {
  describe('party panel', () => {
    it('shows one slot per ally with HP, MP, statuses and Crisis / KO', () => {
      render(<BattleScene battle={demoBattle} />)
      const party = screen.getByRole('region', { name: 'Party' })

      const lyra = within(party).getByTestId('party-slot-a1')
      expect(lyra).toHaveTextContent('Lyra')
      expect(within(lyra).getByTestId('gauge-hp')).toHaveTextContent('PV48 / 62')
      expect(within(lyra).getByTestId('gauge-mp')).toHaveTextContent('PM35 / 50')

      expect(within(party).getByTestId('party-slot-a2')).toHaveAttribute('data-state', 'crisis')
      expect(within(party).getByTestId('party-slot-a2')).toHaveTextContent('Crisi')
      expect(within(party).getByTestId('party-slot-a3')).toHaveTextContent('KO')
      expect(
        within(within(party).getByTestId('party-slot-a4')).getByRole('img', { name: 'Lento' }),
      ).toBeInTheDocument()
    })

    it('omits the MP gauge for allies without MP', () => {
      const battle: BattleState = {
        ...createEmptyBattle(),
        combatants: [createCombatant({ id: 'w', name: 'Warrior', side: 'ally', maxHp: 50 })],
      }
      render(<BattleScene battle={battle} />)
      const slot = screen.getByTestId('party-slot-w')
      expect(within(slot).queryByTestId('gauge-mp')).not.toBeInTheDocument()
    })
  })

  describe('enemies', () => {
    it('always label every enemy on the field, KO included', () => {
      render(<BattleScene battle={demoBattle} />)
      expect(screen.getByTestId('nameplate-e2')).toHaveTextContent('Goblin Sciamano')
      expect(screen.getByTestId('nameplate-e2')).toHaveTextContent('Crisi')
      expect(
        within(screen.getByTestId('nameplate-e2')).getByRole('img', { name: 'Avvelenato' }),
      ).toBeInTheDocument()
      expect(screen.getByTestId('nameplate-e4')).toHaveTextContent('KO')
    })

    it('show exact HP/MP only for revealed foes', () => {
      render(<BattleScene battle={demoBattle} />)
      const shaman = screen.getByTestId('enemy-info-e2') // revealed
      expect(within(shaman).getByTestId('gauge-hp')).toHaveTextContent('PV12/32')
      expect(within(shaman).getByTestId('gauge-mp')).toHaveTextContent('PM25/40')

      const wolf = screen.getByTestId('enemy-info-e3') // hidden
      expect(within(wolf).queryByTestId('gauge-hp')).not.toBeInTheDocument()
      expect(wolf).not.toHaveTextContent('90')
    })

    it('"reveal all" overrides the per-enemy flag', () => {
      const battle: BattleState = {
        ...demoBattle,
        presentation: { ...demoBattle.presentation, revealAllEnemyStats: true },
      }
      render(<BattleScene battle={battle} />)
      const wolf = screen.getByTestId('enemy-info-e3')
      expect(within(wolf).getByTestId('gauge-hp')).toHaveTextContent('PV90/90')
    })
  })

  it('marks sprite states for styling', () => {
    render(<BattleScene battle={demoBattle} />)
    expect(screen.getByTestId('sprite-a1')).toHaveAttribute('data-state', 'ok')
    expect(screen.getByTestId('sprite-a2')).toHaveAttribute('data-state', 'crisis')
    expect(screen.getByTestId('sprite-a3')).toHaveAttribute('data-state', 'ko')
  })

  it('draws the Crisis aura only on combatants in Crisis', () => {
    render(<BattleScene battle={demoBattle} />)
    const aura = (id: string) => screen.getByTestId(id).querySelector('[data-testid=crisis-aura]')
    expect(aura('sprite-a2')).not.toBeNull() // Bastian, Crisis
    expect(aura('sprite-a1')).toBeNull() // Lyra, healthy
    expect(aura('sprite-a3')).toBeNull() // Mirelle, KO
  })

  it('omits the party panel and enemy window when their side is empty', () => {
    render(<BattleScene battle={createEmptyBattle()} />)
    expect(screen.queryByRole('region', { name: 'Party' })).not.toBeInTheDocument()
    expect(screen.queryByTestId(/enemy-info-/)).not.toBeInTheDocument()
  })

  it('uses portrait, then sprite, then placeholder in party slots; mirrors sprites on request', () => {
    const battle: BattleState = {
      ...createEmptyBattle(),
      backgroundAssetId: 'bg',
      combatants: [
        createCombatant({
          id: 'p',
          name: 'Portrait',
          side: 'ally',
          maxHp: 10,
          portraitAssetId: 'face',
          spriteAssetId: 'body',
        }),
        createCombatant({
          id: 's',
          name: 'SpriteOnly',
          side: 'ally',
          maxHp: 10,
          spriteAssetId: 'body2',
        }),
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
    render(
      <AssetResolverProvider resolver={(id) => `blob:${id}`}>
        <BattleScene battle={battle} />
      </AssetResolverProvider>,
    )
    expect(screen.queryByTestId('default-backdrop')).not.toBeInTheDocument()
    const src = (el: HTMLElement) => el.querySelector('img')?.getAttribute('src')
    expect(src(screen.getByTestId('party-slot-p'))).toBe('blob:face')
    expect(src(screen.getByTestId('party-slot-s'))).toBe('blob:body2')

    const drake = screen.getByTestId('sprite-x').querySelector('img')!.parentElement!
    expect(drake.style.transform).toBe('scaleX(-1)')
  })
})
