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
  return projectEventsForPlayers(result.events, state, result.state)
}

describe('projectForPlayers', () => {
  it('removes enemies during preparation', () => {
    expect(projectForPlayers(battle('preparation')).combatants.map((c) => c.id)).toEqual(['hero'])
  })

  it('shows everything once the battle is active', () => {
    const active = battle('active')
    expect(projectForPlayers(active)).toBe(active)
  })
})

describe('projectEventsForPlayers', () => {
  it('hides enemy events during preparation, keeps party events', () => {
    expect(step(battle('preparation'), { type: 'DAMAGE', id: 'orc', amount: 5 })).toEqual([])
    expect(step(battle('preparation'), { type: 'DAMAGE', id: 'hero', amount: 5 })).toHaveLength(1)
  })

  it('hides additions and removals of enemies during preparation', () => {
    expect(
      step(battle('preparation'), {
        type: 'ADD_COMBATANT',
        combatant: { id: 'gob', name: 'Goblin', side: 'enemy', maxHp: 10 },
      }),
    ).toEqual([])
    expect(step(battle('preparation'), { type: 'REMOVE_COMBATANT', id: 'orc' })).toEqual([])
    expect(step(battle('preparation'), { type: 'REMOVE_COMBATANT', id: 'hero' })).toEqual([
      { type: 'COMBATANT_REMOVED', id: 'hero' },
    ])
  })

  it('lets everything through when active, except the full-state load event', () => {
    expect(step(battle('active'), { type: 'DAMAGE', id: 'orc', amount: 5 })).toHaveLength(1)
    expect(step(battle('active'), { type: 'LOAD_BATTLE', state: battle('active') })).toEqual([])
  })

  it('announces the start and the end of the battle', () => {
    expect(step(battle('preparation'), { type: 'START_BATTLE' })).toEqual([
      { type: 'BATTLE_STARTED' },
    ])
    expect(step(battle('active'), { type: 'END_BATTLE' })).toEqual([
      { type: 'BATTLE_ENDED', removedEnemyIds: ['orc'] },
    ])
  })
})
