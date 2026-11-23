import { useEffect } from 'react'

import { battleStore } from '@/app/store'
import { partyLeavingField, type BattleScene, type Unit, type UnitKind } from '@/domain'

import { library } from './library'
import { useLiveQuery } from './liveQuery'

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
