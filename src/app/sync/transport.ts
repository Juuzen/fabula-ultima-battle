import type { SyncMessage } from './protocol'

/**
 * How Master and Display exchange messages. Today: BroadcastChannel (same browser,
 * same origin). Tomorrow it could be a WebSocket, for a Display on another machine,
 * without touching the sync logic.
 */
export type SyncTransport = {
  post: (message: SyncMessage) => void
  /** Receives raw data: callers must validate it. Returns an unsubscribe function. */
  subscribe: (listener: (data: unknown) => void) => () => void
  close: () => void
}

/**
 * In-memory transport hub for tests: every transport receives the messages posted by
 * the others (never its own), like BroadcastChannel. Delivery is synchronous.
 */
export function createMemoryHub() {
  const transports = new Set<{ listeners: Set<(data: unknown) => void> }>()

  return {
    connect(): SyncTransport {
      const self = { listeners: new Set<(data: unknown) => void>() }
      let closed = false
      transports.add(self)
      return {
        post(message) {
          if (closed) return // like a closed BroadcastChannel: nothing goes out
          // structuredClone mimics the real channel: receivers never share references.
          for (const other of transports) {
            if (other === self) continue
            for (const listener of other.listeners) listener(structuredClone(message))
          }
        },
        subscribe(listener) {
          self.listeners.add(listener)
          return () => self.listeners.delete(listener)
        },
        close() {
          closed = true
          transports.delete(self)
        },
      }
    },
  }
}
