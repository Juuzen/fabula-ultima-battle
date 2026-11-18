import { useEffect } from 'react'

import { startDisplaySync } from '@/app/sync/displaySync'
import { SYNC_CHANNEL_NAME } from '@/app/sync/protocol'
import { createBroadcastChannelTransport } from '@/infra/sync/broadcastChannelTransport'

import { useDisplayStore } from './displayStore'

/** Receives the battle from the Master window and shows it. Disabled in demo mode. */
export function useDisplaySync(enabled: boolean) {
  const showBattle = useDisplayStore((s) => s.showBattle)

  useEffect(() => {
    if (!enabled) return
    const transport = createBroadcastChannelTransport(SYNC_CHANNEL_NAME)
    const stop = startDisplaySync({ transport, onState: (state) => showBattle(state) })
    return () => {
      stop()
      transport.close()
    }
  }, [enabled, showBattle])
}
