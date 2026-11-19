import { AnimatePresence, motion } from 'motion/react'

import { useChoreoStore } from '../choreography/choreoStore'

/**
 * JRPG skill-name banner at the top of the screen while an action is played.
 * The enemy info band steps aside meanwhile (see BattleScene), so the top is free.
 */
export function ActionBanner() {
  const stage = useChoreoStore((s) => s.stage)
  const name = stage && stage.step !== 'retreat' ? stage.name : ''

  return (
    <div
      className="pointer-events-none absolute inset-x-0 top-8 flex justify-center"
      style={{ zIndex: 1600 }}
    >
      <AnimatePresence>
        {name && (
          <motion.div
            key={stage!.runId}
            data-testid="action-banner"
            className="jrpg-window h-auto! px-14! py-3!"
            initial={{ opacity: 0, y: -16, scaleX: 0.85 }}
            animate={{ opacity: 1, y: 0, scaleX: 1 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
          >
            <span className="font-display text-4xl font-bold tracking-wider whitespace-nowrap">
              {name}
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
