import type { Combatant } from '@/domain'

import { EnemyNameplate } from './EnemyNameplate'
import type { Slot } from './formation'
import { SPRITE_BOX } from './spriteBox'

/**
 * Enemy nameplates, drawn on their own layer above every sprite so that no
 * sprite can hide them. They stay on screen (KO included) until the battle ends.
 */
export function NameplateLayer({ enemies, slots }: { enemies: Combatant[]; slots: Slot[] }) {
  return (
    <div className="pointer-events-none absolute inset-0" style={{ zIndex: 1200 }}>
      {enemies.map((enemy, i) => {
        const slot = slots[i]
        if (!slot) return null
        return (
          <div
            key={enemy.id}
            className="absolute -translate-x-1/2 -translate-y-full"
            style={{ left: slot.x, top: slot.y - SPRITE_BOX.height * slot.scale - 6 }}
          >
            <EnemyNameplate enemy={enemy} />
          </div>
        )
      })}
    </div>
  )
}
