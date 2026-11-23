import { describe, expect, it } from 'vitest'

import { createDefaultSoundSettings } from './asset'
import { createEmptyBattle, type BattleState } from './battle'
import { createCombatant } from './combatant'
import { OutcomeSchema, suggestedOutcome } from './outcome'
import { musicFor } from './sounds'

const fighters = (heroHp: number, orcHp: number[]): BattleState => ({
  ...createEmptyBattle(),
  phase: 'active',
  combatants: [
    createCombatant({ id: 'hero', name: 'Lyra', side: 'ally', maxHp: 30, hp: heroHp }),
    ...orcHp.map((hp, i) =>
      createCombatant({ id: `orc${i}`, name: `Orco ${i + 1}`, side: 'enemy', maxHp: 30, hp }),
    ),
  ],
})

describe('suggestedOutcome', () => {
  it('suggests victory when every enemy is KO, defeat when the whole party is', () => {
    expect(suggestedOutcome(fighters(30, [0, 0]))).toBe('victory')
    expect(suggestedOutcome(fighters(30, [0, 5]))).toBeNull()
    expect(suggestedOutcome(fighters(0, [5]))).toBe('defeat')
  })

  it('needs someone on the side, and a battle in progress', () => {
    expect(suggestedOutcome(fighters(30, []))).toBeNull()
    expect(suggestedOutcome({ ...fighters(30, [0]), phase: 'preparation' })).toBeNull()
  })
})

describe('OutcomeSchema', () => {
  it('trims the text, and wants it for custom endings only', () => {
    expect(OutcomeSchema.parse({ kind: 'victory', text: ' ' })).toEqual({
      kind: 'victory',
      text: '',
    })
    expect(OutcomeSchema.safeParse({ kind: 'custom', text: '' }).success).toBe(false)
    expect(OutcomeSchema.safeParse({ kind: 'custom', text: 'Tregua' }).success).toBe(true)
  })
})

describe('musicFor', () => {
  const settings = createDefaultSoundSettings()
  settings.outcomes.victory = { assetId: 'fanfare', loop: false }
  const battle = (patch: Partial<BattleState>): BattleState => {
    const base = createEmptyBattle()
    return {
      ...base,
      presentation: {
        ...base.presentation,
        audio: { ...base.presentation.audio, musicAssetId: 'theme' },
      },
      ...patch,
    }
  }

  it("plays the battle's music while it is on, nothing on the waiting screen", () => {
    expect(musicFor(battle({ phase: 'active' }), settings)).toEqual({
      assetId: 'theme',
      loop: true,
    })
    expect(musicFor(battle({}), settings)).toBeNull()
  })

  it('switches to the victory or defeat music, and to silence for other endings', () => {
    const ended = (kind: 'victory' | 'defeat' | 'flee') =>
      battle({ phase: 'ended', outcome: { kind, text: '' } })
    expect(musicFor(ended('victory'), settings)).toEqual({ assetId: 'fanfare', loop: false })
    expect(musicFor(ended('defeat'), settings)).toBeNull() // none chosen
    expect(musicFor(ended('flee'), settings)).toBeNull()
  })
})
