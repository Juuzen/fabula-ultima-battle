import { liveQuery } from 'dexie'
import { useEffect, useEffectEvent, useState } from 'react'

/**
 * Subscribes to a Dexie live query: re-runs whenever the tables it read change.
 * `undefined` while the first result is loading.
 */
export function useLiveQuery<T>(query: () => Promise<T>, key: string): T | undefined {
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
