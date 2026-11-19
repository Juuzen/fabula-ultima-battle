import { AnimatePresence, motion } from 'motion/react'

import type { BattleState } from '@/domain'

import { BattleScene } from './BattleScene'
import { WaitingScreen } from './WaitingScreen'

/** Fade through black between the waiting screen and the battle (both ways). */
export const SCREEN_FADE_SECONDS = 0.6

/**
 * Everything the players can see, given the (already projected) battle:
 * the waiting screen while preparing, the battle scene once it has started.
 * On end, the battle keeps its last frame while fading out (AnimatePresence).
 */
export function PlayerScreen({ battle }: { battle: BattleState }) {
  const preparing = battle.phase === 'preparation'

  return (
    <div className="absolute inset-0 bg-black">
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={preparing ? 'waiting' : 'battle'}
          data-testid={preparing ? 'screen-waiting' : 'screen-battle'}
          className="absolute inset-0"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: SCREEN_FADE_SECONDS, ease: 'easeInOut' }}
        >
          {preparing ? (
            <WaitingScreen backgroundAssetId={battle.presentation.waitingBackgroundAssetId} />
          ) : (
            <BattleScene battle={battle} />
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
