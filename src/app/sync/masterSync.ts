import { projectEventsForPlayers, projectForPlayers, type BattleEvent } from '@/domain'

import type { BattleStore } from '../store/battleStore'
import { parseSyncMessage, PROTOCOL_VERSION } from './protocol'
import type { SyncTransport } from './transport'

/** A Display that sent nothing for this long is considered gone (crash, sleep…). */
export const DISPLAY_TIMEOUT_MS = 12_000
const SWEEP_INTERVAL_MS = 2_000

type Options = {
  store: BattleStore
  transport: SyncTransport
  /** Called whenever the number of connected Displays changes. */
  onDisplaysChange?: (count: number) => void
  now?: () => number
}

/**
 * Master side of the bridge: publishes a projected snapshot (what players may see)
 * after every change, answers Displays that say HELLO, and tracks which are alive.
 * Returns a stop function.
 */
export function startMasterSync({
  store,
  transport,
  onDisplaysChange,
  now = Date.now,
}: Options): () => void {
  const session = crypto.randomUUID()
  let seq = 0
  const displays = new Map<string, number>() // displayId → last seen

  const publish = (events: BattleEvent[]) => {
    seq += 1
    transport.post({
      v: PROTOCOL_VERSION,
      type: 'STATE',
      session,
      seq,
      state: projectForPlayers(store.getState().battle),
      events,
    })
  }

  const setDisplays = (mutate: () => void) => {
    const before = displays.size
    mutate()
    if (displays.size !== before) onDisplaysChange?.(displays.size)
  }

  const stopChanges = store.changes.subscribe((change) => {
    publish(projectEventsForPlayers(change.events, change.state))
  })

  const stopMessages = transport.subscribe((data) => {
    const message = parseSyncMessage(data)
    if (!message) return
    switch (message.type) {
      case 'HELLO':
        setDisplays(() => displays.set(message.displayId, now()))
        publish([]) // fresh snapshot for the newcomer (others just re-render the same state)
        break
      case 'HEARTBEAT':
        if (!displays.has(message.displayId)) publish([]) // a Display we lost track of
        setDisplays(() => displays.set(message.displayId, now()))
        break
      case 'BYE':
        setDisplays(() => displays.delete(message.displayId))
        break
      case 'STATE':
        break // another Master tab: ignore
    }
  })

  const sweep = setInterval(() => {
    const limit = now() - DISPLAY_TIMEOUT_MS
    setDisplays(() => {
      for (const [id, lastSeen] of displays) if (lastSeen < limit) displays.delete(id)
    })
  }, SWEEP_INTERVAL_MS)

  // Displays already open (e.g. the Master was reloaded) get the state right away.
  publish([])

  return () => {
    clearInterval(sweep)
    stopChanges()
    stopMessages()
  }
}
