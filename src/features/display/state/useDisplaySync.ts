import { useEffect } from 'react'

import { startDisplaySync } from '@/app/sync/displaySync'
import { SYNC_CHANNEL_NAME } from '@/app/sync/protocol'
import { createBroadcastChannelTransport } from '@/infra/sync/broadcastChannelTransport'

import { useFxStore } from '../fx/fxStore'
import { useDisplayStore } from './displayStore'

/** Receives the battle (and its visual effects) from the Master window. Off in demo mode. */
export function useDisplaySync(enabled: boolean) {
  const showBattle = useDisplayStore((s) => s.showBattle)
  const pushFx = useFxStore((s) => s.push)

  useEffect(() => {
    if (!enabled) return
    const transport = createBroadcastChannelTransport(SYNC_CHANNEL_NAME)
    const stop = startDisplaySync({
      transport,
      onState: (state, events) => {
        showBattle(state)
        pushFx(events)
      },
    })
    return () => {
      stop()
      transport.close()
    }
  }, [enabled, showBattle, pushFx])
}
