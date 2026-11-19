import { useEffect } from 'react'

import { startDisplaySync } from '@/app/sync/displaySync'
import { SYNC_CHANNEL_NAME } from '@/app/sync/protocol'
import { createBroadcastChannelTransport } from '@/infra/sync/broadcastChannelTransport'

import { useChoreoStore } from '../choreography/choreoStore'
import { createSequencer } from '../choreography/sequencer'
import { useFxStore } from '../fx/fxStore'
import { useDisplayStore } from './displayStore'

/**
 * Receives the battle (and its visual effects) from the Master window and hands it to the
 * sequencer, which plays actions as sequences. Off in demo mode.
 */
export function useDisplaySync(enabled: boolean) {
  const showBattle = useDisplayStore((s) => s.showBattle)
  const pushFx = useFxStore((s) => s.push)
  const setStage = useChoreoStore((s) => s.setStage)

  useEffect(() => {
    if (!enabled) return
    // Every update goes through the sequencer, which plays actions and keeps the order.
    const sequencer = createSequencer({
      apply: (state, events) => {
        showBattle(state)
        pushFx(events)
      },
      setStage,
      reducedMotion: () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false,
    })
    const transport = createBroadcastChannelTransport(SYNC_CHANNEL_NAME)
    const stop = startDisplaySync({ transport, onState: sequencer.enqueue })
    return () => {
      stop()
      transport.close()
      sequencer.dispose()
    }
  }, [enabled, showBattle, pushFx, setStage])
}
