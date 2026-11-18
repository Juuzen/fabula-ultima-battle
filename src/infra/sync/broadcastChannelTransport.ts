import type { SyncTransport } from '@/app/sync/transport'

/** SyncTransport over the browser's BroadcastChannel API (works offline, same origin). */
export function createBroadcastChannelTransport(name: string): SyncTransport {
  const channel = new BroadcastChannel(name)
  return {
    post: (message) => channel.postMessage(message),
    subscribe(listener) {
      const onMessage = (event: MessageEvent) => listener(event.data)
      channel.addEventListener('message', onMessage)
      return () => channel.removeEventListener('message', onMessage)
    },
    close: () => channel.close(),
  }
}
