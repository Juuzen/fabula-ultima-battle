import type { BattleEvent, BattleState } from '@/domain'

import { parseSyncMessage, PROTOCOL_VERSION } from './protocol'
import type { SyncTransport } from './transport'

export const HEARTBEAT_INTERVAL_MS = 4_000

type Options = {
  transport: SyncTransport
  onState: (state: BattleState, events: BattleEvent[]) => void
  displayId?: string
}

/**
 * Display side of the bridge: says HELLO, applies valid snapshots in order,
 * sends heartbeats so the Master knows it is connected, and says BYE on close.
 * Returns a stop function.
 */
export function startDisplaySync({
  transport,
  onState,
  displayId = crypto.randomUUID(),
}: Options): () => void {
  let session: string | null = null
  let lastSeq = 0

  const stopMessages = transport.subscribe((data) => {
    const message = parseSyncMessage(data)
    if (message?.type !== 'STATE') {
      if (message === null) console.warn('Ignoring invalid sync message', data)
      return
    }
    if (message.session !== session) {
      // New Master session (first contact or Master reloaded): start counting again.
      session = message.session
      lastSeq = 0
    }
    if (message.seq <= lastSeq) return // stale or duplicate
    lastSeq = message.seq
    onState(message.state, message.events)
  })

  const say = (type: 'HELLO' | 'HEARTBEAT' | 'BYE') =>
    transport.post({ v: PROTOCOL_VERSION, type, displayId })

  say('HELLO')
  const heartbeat = setInterval(() => say('HEARTBEAT'), HEARTBEAT_INTERVAL_MS)
  const onPageHide = () => say('BYE')
  window.addEventListener('pagehide', onPageHide)

  return () => {
    clearInterval(heartbeat)
    window.removeEventListener('pagehide', onPageHide)
    say('BYE')
    stopMessages()
  }
}
