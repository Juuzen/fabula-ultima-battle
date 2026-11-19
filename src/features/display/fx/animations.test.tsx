import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { AnimatePresence } from 'motion/react'
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

  /** Renders the layer; `rerender(items)` simulates the store after a removal. */
  function renderQueue(items: Fx[]) {
    const remove = vi.fn<(id: number) => void>()
    const layer = (list: Fx[]) => (
      <FxContext value={{ items: list, remove }}>
        <FloatingTextLayer anchors={anchors} />
      </FxContext>
    )
    const { rerender } = render(layer(items))
    return { remove, rerender: (list: Fx[]) => rerender(layer(list)) }
  }

  it('shows damage, heal, MP and Crisis texts on their target', () => {
    renderLayer([
      { id: 1, kind: 'damage', targetId: 'orc', amount: 12 },
      { id: 2, kind: 'crisis', targetId: 'orc' },
    ])
    expect(screen.getByTestId('fx-damage')).toHaveTextContent('12')
    expect(screen.getByTestId('fx-crisis')).toHaveTextContent('Crisi!')
    cleanup()
    renderLayer([
      { id: 3, kind: 'heal', targetId: 'orc', amount: 5 },
      { id: 4, kind: 'mpLoss', targetId: 'orc', amount: 8 },
    ])
    expect(screen.getByTestId('fx-heal')).toHaveTextContent('+5')
    expect(screen.getByTestId('fx-mpLoss')).toHaveTextContent('−8 PM')
  })

  it('announces an applied status by name, in a light tint of its badge colour', () => {
    renderLayer([{ id: 1, kind: 'status', targetId: 'orc', status: 'poisoned' }])
    const text = screen.getByTestId('fx-status')
    expect(text).toHaveTextContent('Avvelenato!')
    expect(text.className).toContain('text-emerald-300')
  })

  it('shows the HP number together with a text, below it', () => {
    renderLayer([
      { id: 1, kind: 'damage', targetId: 'orc', amount: 6 },
      { id: 2, kind: 'status', targetId: 'orc', status: 'enraged' },
    ])
    const top = (id: string) => parseFloat(screen.getByTestId(id).style.top)
    expect(screen.getByTestId('fx-status')).toHaveTextContent('Furente!')
    expect(top('fx-damage')).toBeGreaterThan(top('fx-status'))
  })

  it('plays the texts of a target one at a time, in order, in the same spot', () => {
    const items: Fx[] = [
      { id: 1, kind: 'crisis', targetId: 'orc' },
      { id: 2, kind: 'status', targetId: 'orc', status: 'shaken' },
      { id: 3, kind: 'mpLoss', targetId: 'orc', amount: 8 },
    ]
    const { rerender } = renderQueue(items)
    expect(screen.getByTestId('fx-crisis')).toBeInTheDocument()
    expect(screen.queryByTestId('fx-status')).toBeNull()
    expect(screen.queryByTestId('fx-mpLoss')).toBeNull()
    const spot = screen.getByTestId('fx-crisis').style.cssText

    rerender(items.slice(1)) // "Crisi!" ended
    expect(screen.getByTestId('fx-status').style.cssText).toBe(spot)
    expect(screen.queryByTestId('fx-mpLoss')).toBeNull()

    rerender(items.slice(2)) // "Scosso!" ended
    expect(screen.getByTestId('fx-mpLoss').style.cssText).toBe(spot)
  })

  it('plays the HP numbers of a target one at a time, in order, in the same spot', () => {
    const items: Fx[] = [
      { id: 1, kind: 'damage', targetId: 'orc', amount: 12 },
      { id: 2, kind: 'heal', targetId: 'orc', amount: 5 },
    ]
    const { rerender } = renderQueue(items)
    expect(screen.getByTestId('fx-damage')).toBeInTheDocument()
    expect(screen.queryByTestId('fx-heal')).toBeNull()
    const spot = screen.getByTestId('fx-damage').style.cssText
    rerender(items.slice(1))
    expect(screen.getByTestId('fx-heal').style.cssText).toBe(spot)
  })

  it('plays texts on different targets at the same time', () => {
    render(
      <FxContext
        value={{
          items: [
            { id: 1, kind: 'damage', targetId: 'orc', amount: 12 },
            { id: 2, kind: 'heal', targetId: 'elf', amount: 5 },
          ],
          remove: vi.fn<(id: number) => void>(),
        }}
      >
        <FloatingTextLayer anchors={new Map([...anchors, ['elf', { x: 900, y: 400 }]])} />
      </FxContext>,
    )
    expect(screen.getByTestId('fx-damage')).toBeInTheDocument()
    expect(screen.getByTestId('fx-heal')).toBeInTheDocument()
  })

  it('announces a revive next to the healed HP, then Crisis after it', () => {
    const items: Fx[] = [
      { id: 1, kind: 'heal', targetId: 'orc', amount: 5 },
      { id: 2, kind: 'revive', targetId: 'orc' },
      { id: 3, kind: 'crisis', targetId: 'orc' },
    ]
    const { rerender } = renderQueue(items)
    expect(screen.getByTestId('fx-heal')).toHaveTextContent('+5')
    expect(screen.getByTestId('fx-revive')).toHaveTextContent('Rianimato!')
    expect(screen.queryByTestId('fx-crisis')).toBeNull()

    rerender([items[0]!, items[2]!]) // "Rianimato!" ended
    expect(screen.getByTestId('fx-crisis')).toBeInTheDocument()
  })

  it('drops effects with no text at once, without holding up the line', () => {
    const { remove } = renderQueue([
      { id: 1, kind: 'status', targetId: 'orc' },
      { id: 2, kind: 'crisis', targetId: 'orc' },
    ])
    expect(remove).toHaveBeenCalledWith(1)
    expect(screen.getByTestId('fx-crisis')).toBeInTheDocument()
  })

  it('still plays (and ends) inside an AnimatePresence with initial={false}, like the scene', async () => {
    const remove = vi.fn<(id: number) => void>()
    render(
      <AnimatePresence initial={false}>
        <div key="scene">
          <FxContext
            value={{ items: [{ id: 1, kind: 'damage', targetId: 'orc', amount: 3 }], remove }}
          >
            <FloatingTextLayer anchors={anchors} />
          </FxContext>
        </div>
      </AnimatePresence>,
    )
    await waitFor(() => expect(remove).toHaveBeenCalledWith(1))
  })

  it('removes each effect when its animation ends, and drops effects on absent targets', async () => {
    const remove = renderLayer([
      { id: 1, kind: 'damage', targetId: 'orc', amount: 3 },
      { id: 2, kind: 'damage', targetId: 'ghost', amount: 3 },
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
