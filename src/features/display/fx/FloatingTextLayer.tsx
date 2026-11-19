import { motion } from 'motion/react'
import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'

import type { CombatantId } from '@/domain'

import type { Fx } from './fx'
import { useFx } from './fxContext'

export type Anchor = { x: number; y: number }

const STYLE: Record<Fx['kind'], string> = {
  damage: 'text-white text-7xl',
  heal: 'text-emerald-300 text-7xl',
  mpLoss: 'text-sky-300 text-5xl',
  mpGain: 'text-cyan-200 text-5xl',
  crisis: 'text-amber-300 text-5xl tracking-widest uppercase',
  ko: 'text-red-500 text-6xl tracking-widest',
  revive: 'text-emerald-200 text-5xl',
}

function useLabel(fx: Fx): string | null {
  const { t } = useTranslation()
  switch (fx.kind) {
    case 'damage':
      return String(fx.amount)
    case 'heal':
      return `+${fx.amount}`
    case 'mpLoss':
      return `−${fx.amount} ${t('display.mp')}`
    case 'mpGain':
      return `+${fx.amount} ${t('display.mp')}`
    case 'crisis':
      return `${t('display.crisis')}!`
    case 'ko':
      return t('display.ko')
    case 'revive':
      return null // the green glow on the sprite says it all
  }
}

/** State texts ("Crisi!", "KO") come right after the number that caused them. */
const DELAY: Partial<Record<Fx['kind'], number>> = { crisis: 0.25, ko: 0.25 }

function FloatingText({ fx, anchor, onDone }: { fx: Fx; anchor: Anchor; onDone: () => void }) {
  const label = useLabel(fx)
  if (label === null) return null
  return (
    <motion.div
      data-testid={`fx-${fx.kind}`}
      className={`font-display absolute -translate-x-1/2 -translate-y-full font-black whitespace-nowrap [-webkit-text-stroke:6px_rgba(10,10,25,.9)] [paint-order:stroke_fill] ${STYLE[fx.kind]}`}
      style={{ left: anchor.x, top: anchor.y }}
      initial={{ opacity: 0, y: 24, scale: 0.6 }}
      animate={{ opacity: [0, 1, 1, 0], y: [24, -8, -40, -90], scale: [0.6, 1.2, 1, 1] }}
      transition={{
        duration: 1.4,
        times: [0, 0.15, 0.7, 1],
        ease: 'easeOut',
        delay: DELAY[fx.kind] ?? 0,
      }}
      onAnimationComplete={onDone}
    >
      {label}
    </motion.div>
  )
}

/** Gap between texts stacked on the same target (e.g. "12" then "Crisi!"): one line of text. */
const STACK_GAP = 84

/**
 * Floating combat text over the sprites ("12", "+8", "Crisi!"…). Each text removes its
 * effect from the queue when its animation ends.
 */
export function FloatingTextLayer({ anchors }: { anchors: ReadonlyMap<CombatantId, Anchor> }) {
  const { items, remove } = useFx()

  // Effects on combatants no longer on screen would never finish: drop them.
  useEffect(() => {
    for (const fx of items) if (!anchors.has(fx.targetId)) remove(fx.id)
  }, [items, anchors, remove])

  return (
    <div className="pointer-events-none absolute inset-0" style={{ zIndex: 1300 }}>
      {items.map((fx) => {
        const anchor = anchors.get(fx.targetId)
        if (!anchor) return null
        return (
          <FloatingText
            key={fx.id}
            fx={fx}
            anchor={{ x: anchor.x, y: anchor.y - fx.stack * STACK_GAP }}
            onDone={() => remove(fx.id)}
          />
        )
      })}
    </div>
  )
}
