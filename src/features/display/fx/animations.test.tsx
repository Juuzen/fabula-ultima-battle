import { render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { createEmptyBattle, type BattleState } from '@/domain'

import { demoBattle } from '../demo/demoBattle'
import { AnimatedNumber } from '../hud/AnimatedNumber'
import { ResourceGauge } from '../hud/ResourceGauge'
import { PlayerScreen } from '../scene/PlayerScreen'
import type { Fx } from './fx'
import { FxContext } from './fxContext'
import { FloatingTextLayer } from './FloatingTextLayer'

describe('FloatingTextLayer', () => {
  const anchors = new Map([['orc', { x: 500, y: 400 }]])

  function renderLayer(items: Fx[], remove = vi.fn<(id: number) => void>()) {
    render(
      <FxContext value={{ items, remove }}>
        <FloatingTextLayer anchors={anchors} />
      </FxContext>,
    )
    return remove
  }

  it('shows damage, heal, MP and Crisis texts on their target', () => {
    renderLayer([
      { id: 1, kind: 'damage', targetId: 'orc', amount: 12, stack: 0 },
      { id: 2, kind: 'crisis', targetId: 'orc', stack: 1 },
      { id: 3, kind: 'heal', targetId: 'orc', amount: 5, stack: 2 },
      { id: 4, kind: 'mpLoss', targetId: 'orc', amount: 8, stack: 3 },
    ])
    expect(screen.getByTestId('fx-damage')).toHaveTextContent('12')
    expect(screen.getByTestId('fx-crisis')).toHaveTextContent('Crisi!')
    expect(screen.getByTestId('fx-heal')).toHaveTextContent('+5')
    expect(screen.getByTestId('fx-mpLoss')).toHaveTextContent('−8 PM')
  })

  it('places each text at its own fixed slot', () => {
    renderLayer([
      { id: 1, kind: 'damage', targetId: 'orc', amount: 12, stack: 0 },
      { id: 2, kind: 'crisis', targetId: 'orc', stack: 1 },
    ])
    const top = (id: string) => parseFloat(screen.getByTestId(id).style.top)
    expect(top('fx-crisis')).toBeLessThan(top('fx-damage'))
  })

  it('a text keeps its position when the one below it disappears', () => {
    const crisis: Fx = { id: 2, kind: 'crisis', targetId: 'orc', stack: 1 }
    const remove = vi.fn<(id: number) => void>()
    const { rerender } = render(
      <FxContext
        value={{
          items: [{ id: 1, kind: 'damage', targetId: 'orc', amount: 25, stack: 0 }, crisis],
          remove,
        }}
      >
        <FloatingTextLayer anchors={anchors} />
      </FxContext>,
    )
    const before = screen.getByTestId('fx-crisis').style.top
    rerender(
      <FxContext value={{ items: [crisis], remove }}>
        <FloatingTextLayer anchors={anchors} />
      </FxContext>,
    )
    expect(screen.getByTestId('fx-crisis').style.top).toBe(before)
  })

  it('removes each effect when its animation ends, and drops effects on absent targets', async () => {
    const remove = renderLayer([
      { id: 1, kind: 'damage', targetId: 'orc', amount: 3, stack: 0 },
      { id: 2, kind: 'damage', targetId: 'ghost', amount: 3, stack: 0 },
    ])
    expect(remove).toHaveBeenCalledWith(2)
    await waitFor(() => expect(remove).toHaveBeenCalledWith(1))
  })
})

describe('ResourceGauge', () => {
  const transition = (id: string) => screen.getByTestId(id).style.transition

  it('on damage the bar drops at once and the trail drains after a delay', () => {
    const { rerender } = render(<ResourceGauge kind="hp" label="PV" value={40} max={40} />)
    rerender(<ResourceGauge kind="hp" label="PV" value={10} max={40} />)
    expect(screen.getByTestId('gauge-fill').style.width).toBe('25%')
    expect(transition('gauge-fill')).not.toMatch(/ms ease-out \d+ms/) // no delay
    expect(transition('gauge-trail')).toMatch(/350ms$/) // delayed drain
  })

  it('on healing the trail grows first and the bar follows', () => {
    const { rerender } = render(<ResourceGauge kind="hp" label="PV" value={10} max={40} />)
    rerender(<ResourceGauge kind="hp" label="PV" value={30} max={40} />)
    expect(transition('gauge-fill')).toMatch(/300ms$/)
    expect(screen.getByTestId('gauge-trail').className).toContain('bg-emerald-200')
  })
})

describe('AnimatedNumber', () => {
  it('renders the value (and ends on the new one after a change)', async () => {
    const { container, rerender } = render(<AnimatedNumber value={48} />)
    expect(container).toHaveTextContent('48')
    rerender(<AnimatedNumber value={12} />)
    await waitFor(() => expect(container).toHaveTextContent('12'))
  })
})

describe('PlayerScreen transitions', () => {
  it('fades from the waiting screen to the battle and back', async () => {
    const preparing: BattleState = { ...createEmptyBattle(), phase: 'preparation' }
    const { rerender } = render(<PlayerScreen battle={preparing} />)
    expect(screen.getByTestId('screen-waiting')).toBeInTheDocument()

    rerender(<PlayerScreen battle={demoBattle} />)
    expect(await screen.findByTestId('screen-battle')).toBeInTheDocument()
    await waitFor(() => expect(screen.queryByTestId('screen-waiting')).not.toBeInTheDocument())

    rerender(<PlayerScreen battle={preparing} />)
    expect(await screen.findByTestId('screen-waiting')).toBeInTheDocument()
    await waitFor(() => expect(screen.queryByTestId('screen-battle')).not.toBeInTheDocument())
  })
})
