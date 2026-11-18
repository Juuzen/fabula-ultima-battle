import { describe, expect, it, vi } from 'vitest'

import { createEventBus } from './eventBus'

describe('createEventBus', () => {
  it('delivers to subscribers until they unsubscribe', () => {
    const bus = createEventBus<number>()
    const listener = vi.fn<(n: number) => void>()
    const unsubscribe = bus.subscribe(listener)
    bus.emit(1)
    unsubscribe()
    bus.emit(2)
    expect(listener).toHaveBeenCalledExactlyOnceWith(1)
  })

  it('isolates failing listeners', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const bus = createEventBus<string>()
    const healthy = vi.fn<(s: string) => void>()
    bus.subscribe(() => {
      throw new Error('boom')
    })
    bus.subscribe(healthy)
    bus.emit('x')
    expect(healthy).toHaveBeenCalledWith('x')
  })
})
