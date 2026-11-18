import { describe, expect, it } from 'vitest'

import { STATUS_IDS } from '@/domain'

import en from './locales/en/common.json'
import it_ from './locales/it/common.json'

function keysOf(obj: object, prefix = ''): string[] {
  return Object.entries(obj).flatMap(([key, value]) =>
    typeof value === 'object' && value !== null
      ? keysOf(value as object, `${prefix}${key}.`)
      : [`${prefix}${key}`],
  )
}

describe('locales', () => {
  it('English and Italian define exactly the same keys', () => {
    expect(keysOf(en).sort()).toEqual(keysOf(it_).sort())
  })

  it('has a label for every status effect', () => {
    for (const locale of [en, it_]) {
      expect(Object.keys(locale.status).sort()).toEqual([...STATUS_IDS].sort())
    }
  })
})
