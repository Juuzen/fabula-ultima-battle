import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { createCombatant, createEmptyBattle, type BattleEvent, type BattleState } from '@/domain'

import { createBattleStore, type BattleStore } from '../store/battleStore'
import { HEARTBEAT_INTERVAL_MS, startDisplaySync } from './displaySync'
import { DISPLAY_TIMEOUT_MS, startMasterSync } from './masterSync'
import { parseSyncMessage, PROTOCOL_VERSION } from './protocol'
import { createMemoryHub, type SyncTransport } from './transport'

function makeStore(phase: BattleState['phase'] = 'active'): BattleStore {
  const store = createBattleStore({ storage: null })
  store.setState({
    battle: {
      ...createEmptyBattle(),
      phase,
      combatants: [
        createCombatant({ id: 'hero', name: 'Hero', side: 'ally', maxHp: 30 }),
        createCombatant({ id: 'orc', name: 'Orc', side: 'enemy', maxHp: 30 }),
      ],
    },
  })
  return store
}

/** A Display wired to the hub that records what it receives. */
function display(transport: SyncTransport, displayId = 'screen-1') {
  const received: { state: BattleState; events: BattleEvent[] }[] = []
  const stop = startDisplaySync({
    transport,
    displayId,
    onState: (state, events) => received.push({ state, events }),
  })
  return { received, stop, last: () => received.at(-1) }
}

const ids = (s: BattleState | undefined) => s?.combatants.map((c) => c.id)

describe('Master ↔ Display sync', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('a Display opened after the Master gets the current state on HELLO', () => {
    const hub = createMemoryHub()
    const store = makeStore()
    const stopMaster = startMasterSync({ store, transport: hub.connect() })
    const screen = display(hub.connect())

    expect(ids(screen.last()?.state)).toEqual(['hero', 'orc'])
    screen.stop()
    stopMaster()
  })

  it('a Display opened before the Master gets the state when the Master starts', () => {
    const hub = createMemoryHub()
    const screen = display(hub.connect())
    expect(screen.received).toHaveLength(0)

    const stopMaster = startMasterSync({ store: makeStore(), transport: hub.connect() })
    expect(ids(screen.last()?.state)).toEqual(['hero', 'orc'])
    stopMaster()
  })

  it('pushes every change with its events, and undo too', () => {
    const hub = createMemoryHub()
    const store = makeStore()
    startMasterSync({ store, transport: hub.connect() })
    const screen = display(hub.connect())

    store.getState().dispatch({ type: 'DAMAGE', id: 'orc', amount: 20 })
    expect(screen.last()?.state.combatants[1]?.hp).toBe(10)
    expect(screen.last()?.events.map((e) => e.type)).toEqual(['DAMAGED', 'CRISIS_ENTERED'])

    store.getState().undo()
    expect(screen.last()?.state.combatants[1]?.hp).toBe(30)
    expect(screen.last()?.events).toEqual([])
  })

  describe('preparation phase', () => {
    it('never sends hidden enemies or their events to the Display', () => {
      const hub = createMemoryHub()
      const store = makeStore('preparation')
      startMasterSync({ store, transport: hub.connect() })
      const screen = display(hub.connect())
      expect(ids(screen.last()?.state)).toEqual(['hero'])

      store.getState().dispatch({ type: 'DAMAGE', id: 'orc', amount: 5 })
      expect(ids(screen.last()?.state)).toEqual(['hero'])
      expect(screen.last()?.events).toEqual([])
    })

    it('reveals the enemies on START_BATTLE', () => {
      const hub = createMemoryHub()
      const store = makeStore('preparation')
      startMasterSync({ store, transport: hub.connect() })
      const screen = display(hub.connect())

      store.getState().dispatch({ type: 'START_BATTLE' })
      expect(ids(screen.last()?.state)).toEqual(['hero', 'orc'])
      expect(screen.last()?.events).toEqual([{ type: 'BATTLE_STARTED' }])
    })
  })

  it('ignores stale or duplicated snapshots, and accepts a new Master session', () => {
    const hub = createMemoryHub()
    const fakeMaster = hub.connect()
    const screen = display(hub.connect())
    const send = (session: string, seq: number, name: string) =>
      fakeMaster.post({
        v: PROTOCOL_VERSION,
        type: 'STATE',
        session,
        seq,
        state: { ...createEmptyBattle(), name },
        events: [],
      })

    send('a', 2, 'two')
    send('a', 1, 'one (late)')
    send('a', 2, 'two (duplicate)')
    expect(screen.received.map((r) => r.state.name)).toEqual(['two'])

    send('b', 1, 'reloaded master') // new session: seq starts over
    expect(screen.last()?.state.name).toBe('reloaded master')
  })

  it('ignores malformed messages', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    const hub = createMemoryHub()
    const rogue = hub.connect()
    const screen = display(hub.connect())
    rogue.post({ v: 99, type: 'STATE' } as never)
    rogue.post({
      v: PROTOCOL_VERSION,
      type: 'STATE',
      session: 's',
      seq: 1,
      state: { ...createEmptyBattle(), combatants: [{ id: 'x' }] },
      events: [],
    } as never)
    expect(screen.received).toEqual([])
  })

  describe('connection indicator', () => {
    it('counts Displays from HELLO to BYE', () => {
      const hub = createMemoryHub()
      const counts: number[] = []
      startMasterSync({
        store: makeStore(),
        transport: hub.connect(),
        onDisplaysChange: (n) => counts.push(n),
      })
      const one = display(hub.connect(), 'one')
      const two = display(hub.connect(), 'two')
      one.stop()
      two.stop()
      expect(counts).toEqual([1, 2, 1, 0])
    })

    it('forgets a Display that stops sending heartbeats', () => {
      const hub = createMemoryHub()
      const counts: number[] = []
      startMasterSync({
        store: makeStore(),
        transport: hub.connect(),
        onDisplaysChange: (n) => counts.push(n),
      })
      const transport = hub.connect()
      display(transport, 'crashy')
      // Heartbeats keep it alive…
      vi.advanceTimersByTime(DISPLAY_TIMEOUT_MS * 2)
      expect(counts).toEqual([1])
      // …until the window dies without saying BYE.
      transport.close()
      vi.advanceTimersByTime(DISPLAY_TIMEOUT_MS + HEARTBEAT_INTERVAL_MS)
      expect(counts).toEqual([1, 0])
    })
  })
})

describe('parseSyncMessage', () => {
  it('accepts our messages and rejects anything else', () => {
    expect(parseSyncMessage({ v: PROTOCOL_VERSION, type: 'HELLO', displayId: 'x' })).not.toBeNull()
    expect(parseSyncMessage({ v: PROTOCOL_VERSION, type: 'HELLO' })).toBeNull()
    expect(parseSyncMessage('hello')).toBeNull()
    expect(parseSyncMessage(null)).toBeNull()
  })
})
