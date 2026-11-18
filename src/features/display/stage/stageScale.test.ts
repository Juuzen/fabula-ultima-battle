import { describe, expect, it } from 'vitest'

import { computeStageScale } from './stageScale'

describe('computeStageScale', () => {
  it('is 1 at the native 1920×1080 resolution', () => {
    expect(computeStageScale(1920, 1080)).toBe(1)
  })

  it('fits by height on ultrawide screens', () => {
    expect(computeStageScale(3440, 1440)).toBeCloseTo(1440 / 1080)
  })

  it('fits by width on taller screens', () => {
    expect(computeStageScale(1280, 1024)).toBeCloseTo(1280 / 1920)
  })

  it('returns 0 for an empty viewport', () => {
    expect(computeStageScale(0, 0)).toBe(0)
  })
})
