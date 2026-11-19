import { render } from '@testing-library/react'
import type * as MotionReact from 'motion/react'
import { describe, expect, it, vi } from 'vitest'

import { createCombatant } from '@/domain'

import type { Fx } from '../fx/fx'
import { FxContext } from '../fx/fxContext'
import { CombatantSprite } from './CombatantSprite'

const animate = vi.fn<(selector: string, keyframes: unknown, options?: unknown) => void>()

vi.mock('motion/react', async (importOriginal) => {
  const actual = await importOriginal<typeof MotionReact>()
  return {
    ...actual,
    useAnimate: () => [{ current: document.createElement('div') }, animate],
    useReducedMotion: () => false,
  }
})

const orc = createCombatant({ id: 'orc', name: 'Orc', side: 'enemy', maxHp: 40 })
const slot = { x: 500, y: 600, scale: 1, zIndex: 1 }

function renderSprite(items: Fx[]) {
  const sprite = (list: Fx[]) => (
    <FxContext value={{ items: list, remove: () => {} }}>
      <CombatantSprite combatant={orc} slot={slot} />
    </FxContext>
  )
  const { rerender } = render(sprite(items))
  return (list: Fx[]) => rerender(sprite(list))
}

/** The `filter` keyframes of each glow/flash played so far, in order. */
const flashes = () =>
  animate.mock.calls
    .filter(([selector]) => selector === '[data-flash]')
    .map(([, keyframes]) => String((keyframes as { filter: string[] }).filter[1]))

describe('CombatantSprite hit reaction', () => {
  it('glows gold on revive, not green', () => {
    animate.mockClear()
    renderSprite([
      { id: 1, kind: 'heal', targetId: 'orc', amount: 20 },
      { id: 2, kind: 'revive', targetId: 'orc' },
    ])
    expect(flashes()).toEqual([expect.stringContaining('255,215,90')])
  })

  it('does not replay an older hit when the latest one leaves the queue', () => {
    animate.mockClear()
    const revive: Fx = { id: 1, kind: 'revive', targetId: 'orc' }
    const damage: Fx = { id: 2, kind: 'damage', targetId: 'orc', amount: 30 }
    const rerender = renderSprite([revive])
    rerender([revive, damage])
    expect(flashes()).toHaveLength(2) // revive glow, then the damage flash

    rerender([revive]) // the damage number ended: revive is "latest" again
    expect(flashes()).toHaveLength(2)
  })
})
