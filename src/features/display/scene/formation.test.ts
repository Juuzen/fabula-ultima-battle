import { describe, expect, it } from 'vitest'

import { STAGE_WIDTH } from '../stage/stageScale'
import { FIELD, formationSlots } from './formation'

describe('formationSlots', () => {
  it('returns no slots for an empty side', () => {
    expect(formationSlots(0, 'ally')).toEqual([])
  })

  it('puts enemies on the left half and the party on the right half', () => {
    for (const slot of formationSlots(6, 'enemy')) expect(slot.x).toBeLessThan(STAGE_WIDTH / 2)
    for (const slot of formationSlots(6, 'ally')) expect(slot.x).toBeGreaterThan(STAGE_WIDTH / 2)
  })

  it('mirrors the two sides around the stage centre', () => {
    const enemies = formationSlots(5, 'enemy')
    const allies = formationSlots(5, 'ally')
    enemies.forEach((e, i) => {
      expect(e.x + (allies[i]?.x ?? 0)).toBe(STAGE_WIDTH)
      expect(e.y).toBe(allies[i]?.y)
    })
  })

  it('keeps every sprite inside the battlefield, even with large groups', () => {
    for (let n = 1; n <= 16; n++) {
      for (const slot of formationSlots(n, 'enemy')) {
        expect(slot.y).toBeGreaterThanOrEqual(FIELD.top)
        expect(slot.y).toBeLessThanOrEqual(FIELD.bottom)
        expect(slot.x).toBeGreaterThanOrEqual(FIELD.edgeMargin)
      }
      for (const slot of formationSlots(n, 'ally')) {
        expect(slot.x).toBeLessThanOrEqual(STAGE_WIDTH - FIELD.edgeMargin)
      }
    }
  })

  it('uses a single column up to four combatants, then adds columns', () => {
    const distinctXs = (n: number) => new Set(formationSlots(n, 'enemy').map((s) => s.x)).size
    const distinctYs = (n: number) => new Set(formationSlots(n, 'enemy').map((s) => s.y)).size
    expect(distinctYs(4)).toBe(4)
    // Five enemies → two columns; the back column is offset, so no two sprites share a spot.
    expect(distinctXs(5)).toBe(5)
    expect(distinctYs(5)).toBe(5)
  })

  it('draws lower sprites bigger and on top', () => {
    const [a, b] = formationSlots(2, 'ally')
    expect(b!.y).toBeGreaterThan(a!.y)
    expect(b!.scale).toBeGreaterThan(a!.scale)
    expect(b!.zIndex).toBeGreaterThan(a!.zIndex)
  })
})
