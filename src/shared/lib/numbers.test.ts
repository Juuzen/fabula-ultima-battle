import { describe, expect, it } from 'vitest'

import { parseWholeNumber } from './numbers'

describe('parseWholeNumber', () => {
  it.each([
    ['12', 12],
    ['0', 0],
    [' 7 ', 7],
  ])('parses %j', (input, expected) => {
    expect(parseWholeNumber(input)).toBe(expected)
  })

  it.each(['', '  ', '-3', '2.5', 'abc'])('rejects %j', (input) => {
    expect(parseWholeNumber(input)).toBeNull()
  })
})
