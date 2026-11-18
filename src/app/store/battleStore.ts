import { createJSONStorage, persist, type StateStorage } from 'zustand/middleware'
import { createStore, type StoreApi } from 'zustand/vanilla'

import {
  applyCommand,
  BattleStateSchema,
  createEmptyBattle,
  type BattleCommand,
  type BattleEvent,
  type BattleState,
  type CommandResult,
  type DomainError,
} from '@/domain'
import { createEventBus, type EventBus } from '@/shared/lib/eventBus'

import { migratePersistedBattle } from './migrations'

export const BATTLE_STORAGE_KEY = 'fu-battle.battle'
export const BATTLE_STORAGE_VERSION = 4
const DEFAULT_HISTORY_LIMIT = 50

/** Published after every state change; the sync layer (phase 4) will forward it to the Display. */
export type BattleChange = {
  cause: 'command' | 'undo'
  state: BattleState
  events: BattleEvent[]
}

export type BattleStoreState = {
  battle: BattleState
  /** Undo stack (most recent last). Kept in memory only. */
  past: BattleState[]
  lastError: DomainError | null
  dispatch: (command: BattleCommand) => CommandResult
  undo: () => void
  clearError: () => void
}

export type BattleStore = StoreApi<BattleStoreState> & { changes: EventBus<BattleChange> }

export type BattleStoreOptions = {
  /** Where to persist the battle. `null` disables persistence (e.g. tests). */
  storage?: StateStorage | null
  historyLimit?: number
}

type PersistedBattle = { battle: BattleState }

/** Validates whatever was found in storage; corrupt data falls back to the current state. */
function mergePersisted(persisted: unknown, current: BattleStoreState): BattleStoreState {
  const battle = (persisted as Partial<PersistedBattle> | undefined)?.battle
  if (battle === undefined) return current
  const parsed = BattleStateSchema.safeParse(battle)
  if (!parsed.success) {
    console.warn('Ignoring invalid persisted battle', parsed.error)
    return current
  }
  return { ...current, battle: parsed.data }
}

export function createBattleStore(options: BattleStoreOptions = {}): BattleStore {
  const { historyLimit = DEFAULT_HISTORY_LIMIT } = options
  const storage = options.storage === undefined ? localStorage : options.storage
  const changes = createEventBus<BattleChange>()

  const creator = (
    set: StoreApi<BattleStoreState>['setState'],
    get: StoreApi<BattleStoreState>['getState'],
  ): BattleStoreState => ({
    battle: createEmptyBattle(),
    past: [],
    lastError: null,

    dispatch(command) {
      const { battle, past } = get()
      const result = applyCommand(battle, command)
      if (!result.ok) {
        set({ lastError: result.error })
        return result
      }
      // No-op commands (e.g. setting an already active status) don't pollute history.
      if (result.state === battle) return result

      set({
        battle: result.state,
        past: [...past, battle].slice(-historyLimit),
        lastError: null,
      })
      changes.emit({ cause: 'command', state: result.state, events: result.events })
      return result
    },

    undo() {
      const { past } = get()
      const previous = past.at(-1)
      if (!previous) return
      set({ battle: previous, past: past.slice(0, -1), lastError: null })
      changes.emit({ cause: 'undo', state: previous, events: [] })
    },

    clearError() {
      set({ lastError: null })
    },
  })

  const store =
    storage === null
      ? createStore<BattleStoreState>()(creator)
      : createStore<BattleStoreState>()(
          persist(creator, {
            name: BATTLE_STORAGE_KEY,
            version: BATTLE_STORAGE_VERSION,
            storage: createJSONStorage<PersistedBattle>(() => storage),
            partialize: (s): PersistedBattle => ({ battle: s.battle }),
            merge: mergePersisted,
            // Bump BATTLE_STORAGE_VERSION and extend migrations.ts when the shape changes.
            migrate: (persisted, version) =>
              migratePersistedBattle(persisted, version) as PersistedBattle,
          }),
        )

  return Object.assign(store, { changes })
}
