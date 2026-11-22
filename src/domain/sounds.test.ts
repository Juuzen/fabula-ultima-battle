import { describe, expect, it } from 'vitest'

import { createDefaultSoundSettings, type CustomEffect, type SoundSettings } from './asset'
import { customEffectRef, EffectRefSchema } from './effect'
import type { BattleEvent } from './events'
import { soundCues } from './sounds'

const settings = (): SoundSettings => {
  const s = createDefaultSoundSettings()
  s.system = { hit: 'snd-hit', heal: 'snd-heal', ko: 'snd-ko', battleStart: 'snd-start' }
  s.effects.fire = 'snd-fire'
  return s
}

const blackFlame: CustomEffect = {
  id: 'black-flame',
  name: 'Fiamma nera',
  videoAssetId: 'vid',
  durationMs: 1200,
  impactAt: 0.4,
  scale: 1,
  soundAssetId: 'snd-black',
  updatedAt: 0,
}
const customs = new Map([[blackFlame.id, blackFlame]])

const action = (
  extra: Partial<Extract<BattleEvent, { type: 'ACTION_PERFORMED' }>> = {},
): BattleEvent => ({
  type: 'ACTION_PERFORMED',
  actorId: 'mage',
  name: 'Fuoco',
  effect: 'fire',
  soundAssetId: null,
  targetIds: ['gob'],
  ...extra,
})
const damaged: BattleEvent = { type: 'DAMAGED', id: 'gob', amount: 10, hp: 5 }
const healed: BattleEvent = { type: 'HEALED', id: 'gob', amount: 10, hp: 15 }

describe('soundCues', () => {
  it("prefers the action's own sound, then its effect's, then the default hit", () => {
    expect(soundCues([action({ soundAssetId: 'snd-own' }), damaged], settings())).toEqual([
      'snd-own',
    ])
    expect(soundCues([action(), damaged], settings())).toEqual(['snd-fire'])
    expect(soundCues([action({ effect: 'ice' }), damaged], settings())).toEqual(['snd-hit'])
  })

  it('uses the sound of a custom effect, and the defaults when it has none or is gone', () => {
    const ref = customEffectRef('black-flame')
    expect(soundCues([action({ effect: ref }), damaged], settings(), customs)).toEqual([
      'snd-black',
    ])
    expect(soundCues([action({ effect: customEffectRef('gone') }), damaged], settings())).toEqual([
      'snd-hit',
    ])
  })

  it('plays the heal sound for heals and MP restored', () => {
    expect(soundCues([action({ effect: null }), healed], settings())).toEqual(['snd-heal'])
    expect(soundCues([{ type: 'MP_RESTORED', id: 'gob', amount: 5, mp: 10 }], settings())).toEqual([
      'snd-heal',
    ])
  })

  it("counts MP damage as a hit, but not the actor's own MP cost", () => {
    const cost: BattleEvent = { type: 'MP_SPENT', id: 'mage', amount: 10, mp: 0 }
    const drain: BattleEvent = { type: 'MP_SPENT', id: 'gob', amount: 6, mp: 0 }
    const none = { ...settings(), effects: createDefaultSoundSettings().effects }
    expect(soundCues([action(), cost, healed], none)).toEqual(['snd-heal'])
    expect(soundCues([action(), cost, drain], none)).toEqual(['snd-hit'])
    // Quick "spend MP" from the field card: bookkeeping, no sound.
    expect(soundCues([cost], none)).toEqual([])
  })

  it('adds the KO sound, and plays the battle-start sound', () => {
    const ko: BattleEvent = { type: 'KNOCKED_OUT', id: 'gob' }
    expect(soundCues([action(), damaged, ko], settings())).toEqual(['snd-fire', 'snd-ko'])
    expect(soundCues([{ type: 'BATTLE_STARTED' }], settings())).toEqual(['snd-start'])
  })

  it('stays silent when nothing is assigned', () => {
    expect(soundCues([action(), damaged], createDefaultSoundSettings())).toEqual([])
  })
})

describe('EffectRefSchema', () => {
  it('accepts built-in effects and custom references only', () => {
    expect(EffectRefSchema.safeParse('fire').success).toBe(true)
    expect(EffectRefSchema.safeParse('custom:abc').success).toBe(true)
    expect(EffectRefSchema.safeParse('custom:').success).toBe(false)
    expect(EffectRefSchema.safeParse('meteor').success).toBe(false)
  })
})
