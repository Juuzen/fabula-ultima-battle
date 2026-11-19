import { beforeEach, describe, expect, it } from 'vitest'

import { eventsToFx } from './fx'
import { useFxStore } from './fxStore'

describe('eventsToFx', () => {
  it('maps HP/MP and threshold events to visual effects, with increasing ids', () => {
    const fx = eventsToFx(
      [
        { type: 'DAMAGED', id: 'orc', amount: 12, hp: 8 },
        { type: 'CRISIS_ENTERED', id: 'orc' },
        { type: 'HEALED', id: 'hero', amount: 5, hp: 30 },
        { type: 'MP_SPENT', id: 'mage', amount: 10, mp: 20 },
        { type: 'MP_RESTORED', id: 'mage', amount: 4, mp: 24 },
        { type: 'KNOCKED_OUT', id: 'gob' },
        { type: 'REVIVED', id: 'gob' },
      ],
      10,
    )
    expect(fx).toEqual([
      { id: 10, kind: 'damage', targetId: 'orc', amount: 12 },
      { id: 11, kind: 'crisis', targetId: 'orc' },
      { id: 12, kind: 'heal', targetId: 'hero', amount: 5 },
      { id: 13, kind: 'mpLoss', targetId: 'mage', amount: 10 },
      { id: 14, kind: 'mpGain', targetId: 'mage', amount: 4 },
      { id: 15, kind: 'ko', targetId: 'gob' },
      { id: 16, kind: 'revive', targetId: 'gob' },
    ])
  })

  it('keeps 0 damage (a miss is still worth showing) but skips no-op MP changes', () => {
    const fx = eventsToFx(
      [
        { type: 'DAMAGED', id: 'orc', amount: 0, hp: 30 },
        { type: 'MP_SPENT', id: 'mage', amount: 0, mp: 0 },
      ],
      1,
    )
    expect(fx.map((f) => f.kind)).toEqual(['damage'])
  })

  it('announces a newly applied status, but not a removed one', () => {
    const fx = eventsToFx(
      [
        { type: 'STATUS_CHANGED', id: 'orc', status: 'poisoned', active: true },
        { type: 'STATUS_CHANGED', id: 'orc', status: 'slow', active: false },
      ],
      1,
    )
    expect(fx).toEqual([{ id: 1, kind: 'status', targetId: 'orc', status: 'poisoned' }])
  })

  it('ignores events without a visual counterpart', () => {
    expect(eventsToFx([{ type: 'BATTLE_RENAMED', name: 'x' }], 1)).toEqual([])
  })
})

describe('useFxStore', () => {
  beforeEach(() => useFxStore.setState({ items: [], nextId: 1 }))

  it('queues effects and removes them when done', () => {
    const { push, remove } = useFxStore.getState()
    push([{ type: 'DAMAGED', id: 'orc', amount: 3, hp: 27 }])
    push([{ type: 'HEALED', id: 'orc', amount: 3, hp: 30 }])
    expect(useFxStore.getState().items.map((f) => f.id)).toEqual([1, 2])
    remove(1)
    expect(useFxStore.getState().items.map((f) => f.id)).toEqual([2])
  })

  it('caps the queue so stale effects cannot pile up', () => {
    const { push } = useFxStore.getState()
    for (let i = 0; i < 100; i++) push([{ type: 'DAMAGED', id: 'orc', amount: 1, hp: 1 }])
    expect(useFxStore.getState().items).toHaveLength(40)
    expect(useFxStore.getState().items.at(-1)?.id).toBe(100)
  })
})
