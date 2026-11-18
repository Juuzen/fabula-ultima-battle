import { useEffect, useState } from 'react'

import { battleStore } from '@/app/store'
import { startMasterSync } from '@/app/sync/masterSync'
import { SYNC_CHANNEL_NAME } from '@/app/sync/protocol'
import { createBroadcastChannelTransport } from '@/infra/sync/broadcastChannelTransport'

/** Publishes the battle to the player screens; returns how many are connected. */
export function useMasterSync(): number {
  const [displays, setDisplays] = useState(0)

  useEffect(() => {
    const transport = createBroadcastChannelTransport(SYNC_CHANNEL_NAME)
    const stop = startMasterSync({ store: battleStore, transport, onDisplaysChange: setDisplays })
    return () => {
      stop()
      transport.close()
    }
  }, [])

  return displays
}
