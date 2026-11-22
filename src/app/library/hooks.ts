import { liveQuery } from 'dexie'
import { useEffect, useEffectEvent, useState } from 'react'

import { battleStore } from '@/app/store'
import { partyLeavingField, type BattleScene, type Unit, type UnitKind } from '@/domain'

import { library } from './library'

/**
 * Subscribes to a Dexie live query: re-runs whenever the tables it read change.
 * `undefined` while the first result is loading.
 */
function useLiveQuery<T>(query: () => Promise<T>, key: string): T | undefined {
  const [state, setState] = useState<{ key: string; value: T } | undefined>(undefined)
  // `key` identifies the query; the closure itself is new on every render.
  const run = useEffectEvent(query)

  useEffect(() => {
    const subscription = liveQuery(() => run()).subscribe({
      next: (value) => setState({ key, value }),
      error: (error: unknown) => console.error('Library query failed', error),
    })
    return () => subscription.unsubscribe()
  }, [key])

  // Never show the previous query's result while the new one loads.
  return state?.key === key ? state.value : undefined
}

export function useUnits(kind: UnitKind): Unit[] | undefined {
  return useLiveQuery(() => library.listUnits(kind), `units:${kind}`)
}

/** One sheet by id (null = none); undefined while loading or when it does not exist. */
export function useUnit(id: string | null): Unit | undefined {
  return useLiveQuery(
    async () => (id ? (await library.getUnits([id])).get(id) : undefined),
    `unit:${id ?? ''}`,
  )
}

export function useScenes(): BattleScene[] | undefined {
  return useLiveQuery(() => library.listScenes(), 'scenes')
}

/**
 * When party members leave the field (removed, scene replaced, battle ended) their sheets
 * get the PV/PM they left with. Runs in the Master shell, whatever section is open.
 */
export function usePartyWriteBack() {
  useEffect(
    () =>
      battleStore.subscribe((state, previous) => {
        if (state.battle === previous.battle) return
        const updates = partyLeavingField(previous.battle, state.battle)
        if (updates.length > 0) {
          library.writeBackParty(updates).catch((error: unknown) => {
            console.error('Could not save party PV/PM to the sheets', error)
          })
        }
      }),
    [],
  )
}
