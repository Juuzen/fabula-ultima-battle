import { useEffect } from 'react'

import { startDisplaySync } from '@/app/sync/displaySync'
import { SYNC_CHANNEL_NAME } from '@/app/sync/protocol'
import { createBroadcastChannelTransport } from '@/infra/sync/broadcastChannelTransport'

import { playUpdateSounds } from '../audio/displayAudio'
import { useChoreoStore } from '../choreography/choreoStore'
import { createSequencer } from '../choreography/sequencer'
import { timingOf } from '../choreography/timeline'
import { useFxStore } from '../fx/fxStore'
import { useDisplayStore } from './displayStore'
import { useLibraryFeed } from './libraryFeed'

/**
 * Receives the battle (and its visual effects) from the Master window and hands it to the
 * sequencer, which plays actions as sequences and their sounds on impact. Off in demo mode.
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
      // Custom effects bring their own timing; their latest version is in the feed.
      timing: (effect) => timingOf(effect, useLibraryFeed.getState().customEffects),
      onLand: playUpdateSounds,
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
