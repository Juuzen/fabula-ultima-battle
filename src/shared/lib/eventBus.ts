export type Listener<T> = (payload: T) => void

export type EventBus<T> = {
  emit: (payload: T) => void
  /** Returns an unsubscribe function. */
  subscribe: (listener: Listener<T>) => () => void
}

/** Minimal synchronous typed pub/sub. A throwing listener does not stop the others. */
export function createEventBus<T>(): EventBus<T> {
  const listeners = new Set<Listener<T>>()
  return {
    emit(payload) {
      for (const listener of listeners) {
        try {
          listener(payload)
        } catch (error) {
          console.error('EventBus listener failed', error)
        }
      }
    },
    subscribe(listener) {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
  }
}
