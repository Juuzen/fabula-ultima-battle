import { act, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { BUILTIN_EFFECTS, type EffectId } from '@/domain'

import { useChoreoStore, type Stage } from '../choreography/choreoStore'
import { demoBattle } from '../demo/demoBattle'
import { BattleScene } from '../scene/BattleScene'

function stage(step: Stage['step'], effect: EffectId = 'fire', name = 'Palla di fuoco'): Stage {
  return {
    runId: 1,
    step,
    actorId: 'a1',
    name,
    effect,
    kind: 'damage',
    targetIds: ['e1', 'e2'],
  }
}

describe('action sequence on the scene', () => {
  afterEach(() => useChoreoStore.setState({ stage: null }))

  it.each(BUILTIN_EFFECTS)(
    'draws the "%s" effect on every target during the effect step',
    (effect) => {
      render(<BattleScene battle={demoBattle} />)
      act(() => useChoreoStore.getState().setStage(stage('effect', effect)))
      expect(screen.getByTestId(`effect-${effect}-e1`)).toBeInTheDocument()
      expect(screen.getByTestId(`effect-${effect}-e2`)).toBeInTheDocument()
    },
  )

  it('shows no effect before or after the effect step', () => {
    render(<BattleScene battle={demoBattle} />)
    act(() => useChoreoStore.getState().setStage(stage('cast')))
    expect(screen.queryByTestId('effect-layer')).not.toBeInTheDocument()
    act(() => useChoreoStore.getState().setStage(stage('retreat')))
    expect(screen.queryByTestId('effect-layer')).not.toBeInTheDocument()
  })

  it('shows the action name in a banner, and none when the action has no name', async () => {
    render(<BattleScene battle={demoBattle} />)
    act(() => useChoreoStore.getState().setStage(stage('advance')))
    expect(screen.getByTestId('action-banner')).toHaveTextContent('Palla di fuoco')
    act(() => useChoreoStore.getState().setStage({ ...stage('advance', 'slash', ''), runId: 2 }))
    // The banner leaves with a short exit animation.
    await waitFor(() => expect(screen.queryByTestId('action-banner')).not.toBeInTheDocument())
  })

  it('moves the enemy band aside while an action plays, and brings it back after', () => {
    const { container } = render(<BattleScene battle={demoBattle} />) // demo: band shown manually
    // Queried by attribute: an aria-hidden region is (correctly) not exposed by role.
    const band = () => container.querySelector('section[aria-label="Nemici"]')
    expect(band()).toHaveAttribute('data-visible', 'true')
    act(() => useChoreoStore.getState().setStage(stage('advance')))
    expect(band()).toHaveAttribute('data-visible', 'false')
    act(() => useChoreoStore.getState().setStage(null))
    expect(band()).toHaveAttribute('data-visible', 'true')
  })

  it('marks the actor (and only it) with its step, and glows while casting', () => {
    render(<BattleScene battle={demoBattle} />)
    act(() => useChoreoStore.getState().setStage(stage('cast')))
    expect(screen.getByTestId('sprite-a1')).toHaveAttribute('data-acting', 'cast')
    expect(screen.getByTestId('sprite-e1')).not.toHaveAttribute('data-acting')
    expect(screen.getByTestId('cast-glow')).toBeInTheDocument()
  })
})
