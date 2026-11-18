import { describe, expect, it } from 'vitest'

import { partySlotWidth, SLOT_GAP } from './partyLayout'

describe('partySlotWidth', () => {
  it('caps the width for small parties', () => {
    expect(partySlotWidth(1)).toBe(320)
    expect(partySlotWidth(4)).toBe(320)
  })

  it('always fits the party inside the stage', () => {
    for (let n = 1; n <= 10; n++) {
      const total = n * partySlotWidth(n) + (n - 1) * SLOT_GAP
      expect(total).toBeLessThanOrEqual(1800)
    }
  })
})
