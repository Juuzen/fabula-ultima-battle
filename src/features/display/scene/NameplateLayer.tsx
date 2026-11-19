import { AnimatePresence, motion } from 'motion/react'

import type { Combatant } from '@/domain'

import { entranceDelay } from './entrance'
import { EnemyNameplate } from './EnemyNameplate'
import type { Slot } from './formation'
import { SPRITE_BOX } from './spriteBox'

/**
 * Enemy nameplates, drawn on their own layer above every sprite so that no
 * sprite can hide them. They stay on screen (KO included) until the battle ends,
 * and follow their sprite when the formation changes.
 */
export function NameplateLayer({ enemies, slots }: { enemies: Combatant[]; slots: Slot[] }) {
  return (
    <div className="pointer-events-none absolute inset-0" style={{ zIndex: 1200 }}>
      <AnimatePresence>
        {enemies.map((enemy, i) => {
          const slot = slots[i]
          if (!slot) return null
          const left = slot.x
          const top = slot.y - SPRITE_BOX.height * slot.scale - 6
          return (
            <motion.div
              key={enemy.id}
              className="absolute -translate-x-1/2 -translate-y-full"
              initial={{ opacity: 0, left, top }}
              animate={{ opacity: 1, left, top }}
              exit={{ opacity: 0 }}
              transition={{
                opacity: { duration: 0.4, delay: entranceDelay(i) + 0.3 },
                left: { duration: 0.4, ease: 'easeInOut' },
                top: { duration: 0.4, ease: 'easeInOut' },
              }}
            >
              <EnemyNameplate enemy={enemy} />
            </motion.div>
          )
        })}
      </AnimatePresence>
    </div>
  )
}
