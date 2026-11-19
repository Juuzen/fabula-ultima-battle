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
      { id: 10, kind: 'damage', targetId: 'orc', amount: 12, stack: 0 },
      { id: 11, kind: 'crisis', targetId: 'orc', stack: 1 },
      { id: 12, kind: 'heal', targetId: 'hero', amount: 5, stack: 0 },
      { id: 13, kind: 'mpLoss', targetId: 'mage', amount: 10, stack: 0 },
      { id: 14, kind: 'mpGain', targetId: 'mage', amount: 4, stack: 1 },
      { id: 15, kind: 'ko', targetId: 'gob', stack: 0 },
      { id: 16, kind: 'revive', targetId: 'gob', stack: 1 },
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

  it('gives each text a fixed slot: it never moves when the one below finishes', () => {
    const { push, remove } = useFxStore.getState()
    push([
      { type: 'DAMAGED', id: 'orc', amount: 25, hp: 15 },
      { type: 'CRISIS_ENTERED', id: 'orc' },
    ])
    const [damage, crisis] = useFxStore.getState().items
    expect([damage?.stack, crisis?.stack]).toEqual([0, 1])

    remove(damage!.id)
    expect(useFxStore.getState().items).toEqual([crisis]) // same object, same slot (1)

    // A new hit while "Crisi!" is still floating takes the free slot below it.
    push([{ type: 'DAMAGED', id: 'orc', amount: 3, hp: 12 }])
    expect(useFxStore.getState().items.map((f) => f.stack)).toEqual([1, 0])
  })

  it('caps the queue so stale effects cannot pile up', () => {
    const { push } = useFxStore.getState()
    for (let i = 0; i < 100; i++) push([{ type: 'DAMAGED', id: 'orc', amount: 1, hp: 1 }])
    expect(useFxStore.getState().items).toHaveLength(40)
    expect(useFxStore.getState().items.at(-1)?.id).toBe(100)
  })
})
