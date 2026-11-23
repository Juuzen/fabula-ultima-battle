import { describe, expect, it } from 'vitest'

import { createEmptyBattle, type BattleState } from './battle'
import { createCombatant } from './combatant'
import { applyCommand, type BattleCommand } from './commands'
import { projectEventsForPlayers, projectForPlayers } from './projection'

function battle(phase: BattleState['phase']): BattleState {
  return {
    ...createEmptyBattle(),
    phase,
    combatants: [
      createCombatant({ id: 'hero', name: 'Hero', side: 'ally', maxHp: 30 }),
      createCombatant({ id: 'orc', name: 'Orc', side: 'enemy', maxHp: 30 }),
    ],
  }
}

function step(state: BattleState, command: BattleCommand) {
  const result = applyCommand(state, command)
  if (!result.ok) throw new Error(result.error.message)
  return projectEventsForPlayers(result.events, result.state)
}

describe('projectForPlayers', () => {
  it('sends no combatant at all during preparation (players see the waiting screen)', () => {
    const projected = projectForPlayers(battle('preparation'))
    expect(projected.combatants).toEqual([])
    expect(projected.phase).toBe('preparation')
    expect(projected.presentation).toEqual(battle('preparation').presentation)
  })

  it('shows everything once the battle is active', () => {
    const active = battle('active')
    expect(projectForPlayers(active)).toBe(active)
  })
})

describe('projectEventsForPlayers', () => {
  it('drops every combatant event during preparation, party included', () => {
    expect(step(battle('preparation'), { type: 'DAMAGE', id: 'orc', amount: 5 })).toEqual([])
    expect(step(battle('preparation'), { type: 'DAMAGE', id: 'hero', amount: 5 })).toEqual([])
    expect(
      step(battle('preparation'), {
        type: 'ADD_COMBATANT',
        combatant: { id: 'gob', name: 'Goblin', side: 'enemy', maxHp: 10 },
      }),
    ).toEqual([])
  })

  it('keeps battle-level events during preparation', () => {
    expect(
      step(battle('preparation'), { type: 'SET_BACKGROUND', assetId: 'forest' }).map((e) => e.type),
    ).toEqual(['BACKGROUND_CHANGED'])
  })

  it('lets everything through when active, except the full-state load event', () => {
    expect(step(battle('active'), { type: 'DAMAGE', id: 'orc', amount: 5 })).toHaveLength(1)
    expect(step(battle('active'), { type: 'LOAD_BATTLE', state: battle('active') })).toEqual([])
  })

  it('announces the start and the end of the battle', () => {
    expect(step(battle('preparation'), { type: 'START_BATTLE' })).toEqual([
      { type: 'BATTLE_STARTED' },
    ])
    const victory = { kind: 'victory', text: '' } as const
    expect(step(battle('active'), { type: 'END_BATTLE', outcome: victory })).toEqual([
      { type: 'BATTLE_ENDED', outcome: victory },
    ])
    expect(step(battle('active'), { type: 'END_SCENE' })).toEqual([
      { type: 'SCENE_ENDED', removedIds: ['hero', 'orc'] },
    ])
  })

  it('keeps showing the field after the battle ends, until the scene does', () => {
    const ended = {
      ...battle('active'),
      phase: 'ended' as const,
      outcome: { kind: 'flee' as const, text: '' },
    }
    expect(projectForPlayers(ended).combatants).toHaveLength(2)
    expect(step(ended, { type: 'DAMAGE', id: 'orc', amount: 5 })).toHaveLength(1)
  })
})
