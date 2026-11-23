import { describe, expect, it } from 'vitest'

import { createEmptyBattle, type BattleState } from './battle'
import { applyCommand, type BattleCommand } from './commands'
import { createCombatant } from './combatant'

function run(state: BattleState, command: BattleCommand): BattleState {
  const result = applyCommand(state, command)
  if (!result.ok) throw new Error(result.error.message)
  return result.state
}

describe('audio settings', () => {
  it('starts with no music and default volumes', () => {
    expect(createEmptyBattle().presentation.audio).toEqual({
      musicAssetId: null,
      musicVolume: 70,
      sfxVolume: 80,
      muted: false,
    })
  })

  it('changes track, volumes and mute through SET_PRESENTATION, clamping volumes', () => {
    const state = run(createEmptyBattle(), {
      type: 'SET_PRESENTATION',
      changes: { audio: { musicAssetId: 'theme', musicVolume: 140, sfxVolume: -3, muted: true } },
    })
    expect(state.presentation.audio).toEqual({
      musicAssetId: 'theme',
      musicVolume: 100,
      sfxVolume: 0,
      muted: true,
    })
    // Other presentation settings are left alone.
    expect(state.presentation.enemyPanel).toEqual(createEmptyBattle().presentation.enemyPanel)
  })

  it("LOAD_SCENE brings the scene's music; END_BATTLE stops it and keeps the volumes", () => {
    const quiet = run(createEmptyBattle(), {
      type: 'SET_PRESENTATION',
      changes: { audio: { musicVolume: 30 } },
    })
    const loaded = run(quiet, {
      type: 'LOAD_SCENE',
      name: 'Porto',
      backgroundAssetId: null,
      musicAssetId: 'harbour',
      combatants: [createCombatant({ id: 'gob', name: 'Goblin', side: 'enemy', maxHp: 10 })],
    })
    expect(loaded.presentation.audio).toMatchObject({ musicAssetId: 'harbour', musicVolume: 30 })
    const ended = run(run(loaded, { type: 'START_BATTLE' }), { type: 'END_BATTLE' })
    expect(ended.presentation.audio).toMatchObject({ musicAssetId: null, musicVolume: 30 })
  })
})
