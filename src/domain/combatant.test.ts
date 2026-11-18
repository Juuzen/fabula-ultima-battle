import { describe, expect, it } from 'vitest'

import {
  clampResource,
  CombatantSchema,
  createCombatant,
  crisisThreshold,
  isInCrisis,
  isKnockedOut,
} from './combatant'

describe('crisis', () => {
  it.each([
    [40, 20],
    [41, 20],
    [1, 0],
  ])('threshold for %i max HP is %i', (maxHp, expected) => {
    expect(crisisThreshold(maxHp)).toBe(expected)
  })

  it('is in Crisis at or below half max HP', () => {
    expect(isInCrisis({ hp: 21, maxHp: 41 })).toBe(false)
    expect(isInCrisis({ hp: 20, maxHp: 41 })).toBe(true)
    expect(isInCrisis({ hp: 1, maxHp: 41 })).toBe(true)
  })

  it('a knocked-out combatant is not in Crisis', () => {
    expect(isInCrisis({ hp: 0, maxHp: 40 })).toBe(false)
    expect(isKnockedOut({ hp: 0 })).toBe(true)
  })
})

describe('clampResource', () => {
  it('clamps to [0, maxHp] and drops decimals', () => {
    expect(clampResource(-5, 30)).toBe(0)
    expect(clampResource(45, 30)).toBe(30)
    expect(clampResource(12.9, 30)).toBe(12)
  })
})

describe('createCombatant', () => {
  it('fills defaults: full HP, no statuses, no sprite', () => {
    const c = createCombatant({ id: 'a', name: 'Aria', side: 'ally', maxHp: 50 })
    expect(c).toEqual({
      id: 'a',
      name: 'Aria',
      side: 'ally',
      maxHp: 50,
      hp: 50,
      maxMp: 0,
      mp: 0,
      statuses: [],
      spriteAssetId: null,
      portraitAssetId: null,
      flipSprite: false,
      revealStats: false,
    })
    expect(CombatantSchema.safeParse(c).success).toBe(true)
  })
})

describe('CombatantSchema', () => {
  const base = createCombatant({ id: 'a', name: 'Aria', side: 'ally', maxHp: 50 })

  it('rejects hp above maxHp', () => {
    expect(CombatantSchema.safeParse({ ...base, hp: 51 }).success).toBe(false)
  })

  it('rejects mp above maxMp', () => {
    expect(CombatantSchema.safeParse({ ...base, maxMp: 10, mp: 11 }).success).toBe(false)
  })

  it('starts with full MP when a maximum is given', () => {
    expect(createCombatant({ id: 'm', name: 'Mage', side: 'ally', maxHp: 30, maxMp: 45 }).mp).toBe(
      45,
    )
  })

  it('rejects duplicate statuses', () => {
    expect(CombatantSchema.safeParse({ ...base, statuses: ['slow', 'slow'] }).success).toBe(false)
  })

  it('rejects unknown statuses and blank names', () => {
    expect(CombatantSchema.safeParse({ ...base, statuses: ['frozen'] }).success).toBe(false)
    expect(CombatantSchema.safeParse({ ...base, name: '   ' }).success).toBe(false)
  })
})
