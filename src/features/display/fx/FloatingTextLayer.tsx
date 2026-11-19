import { AnimatePresence, motion } from 'motion/react'
import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import type { TFunction } from 'i18next'

import type { CombatantId } from '@/domain'

import type { Fx } from './fx'
import { STATUS_VISUALS } from '../hud/statusVisuals'
import { useFx } from './fxContext'

export type Anchor = { x: number; y: number }

const STYLE: Record<Fx['kind'], string> = {
  damage: 'text-white text-7xl',
  heal: 'text-emerald-300 text-7xl',
  mpLoss: 'text-sky-300 text-5xl',
  mpGain: 'text-cyan-200 text-5xl',
  crisis: 'text-amber-300 text-5xl tracking-widest uppercase',
  ko: 'text-red-500 text-6xl tracking-widest',
  revive: 'text-yellow-200 text-5xl tracking-widest uppercase',
  status: 'text-5xl', // colour: the status badge's (see className below)
}

function labelOf(fx: Fx, t: TFunction): string | null {
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
      return `${t('display.revive')}!`
    case 'status':
      return fx.status ? `${t(`status.${fx.status}`)}!` : null
  }
}

function FloatingText({
  fx,
  label,
  anchor,
  onDone,
}: {
  fx: Fx
  label: string
  anchor: Anchor
  onDone: () => void
}) {
  const colour = fx.kind === 'status' && fx.status ? STATUS_VISUALS[fx.status].textColour : ''
  return (
    <motion.div
      data-testid={`fx-${fx.kind}`}
      className={`font-display absolute -translate-x-1/2 -translate-y-full font-black whitespace-nowrap [-webkit-text-stroke:6px_rgba(10,10,25,.9)] [paint-order:stroke_fill] ${STYLE[fx.kind]} ${colour}`}
      style={{ left: anchor.x, top: anchor.y }}
      // Stays in place: fades in, holds, fades out.
      initial={{ opacity: 0 }}
      animate={{ opacity: [0, 1, 1, 0] }}
      transition={{ duration: 1.4, times: [0, 0.15, 0.7, 1], ease: 'easeInOut' }}
      onAnimationComplete={onDone}
    >
      {label}
    </motion.div>
  )
}

/**
 * Each combatant has two lanes, played side by side:
 * - `number`: HP damage and healing ("12", "+8");
 * - `text`: everything else ("Crisi!", "Avvelenato!", "KO", "−8 PM"…).
 * Within a lane, effects play one at a time in order, always in the same spot.
 */
type Lane = 'number' | 'text'

const laneOf = (fx: Fx): Lane => (fx.kind === 'damage' || fx.kind === 'heal' ? 'number' : 'text')

/**
 * The number sits just below the text, over the sprite: the two never overlap and neither
 * climbs towards the badges and nameplates above the sprite. ≈ one line of the number's size.
 */
const NUMBER_DROP = 76

/**
 * Floating combat text over the sprites. In each lane (see `Lane`) the next effect starts when
 * the current one has faded out and removed itself from the queue, so "12" and "Crisi!" show
 * together, while "Crisi!" then "Avvelenato!" follow one another. Different combatants play in
 * parallel. Effects with no text never hold up a lane and are dropped from the queue at once.
 */
export function FloatingTextLayer({ anchors }: { anchors: ReadonlyMap<CombatantId, Anchor> }) {
  const { t } = useTranslation()
  const { items, remove } = useFx()

  // Effects on combatants no longer on screen, or with no text to show, would never finish:
  // drop them (the sprite has already seen them in the render that added them).
  useEffect(() => {
    for (const fx of items) if (!anchors.has(fx.targetId) || labelOf(fx, t) === null) remove(fx.id)
  }, [items, anchors, remove, t])

  // Head of each lane: its oldest effect that has a text.
  const current = new Map<string, { fx: Fx; label: string; lane: Lane }>()
  for (const fx of [...items].sort((a, b) => a.id - b.id)) {
    const lane = laneOf(fx)
    const key = `${fx.targetId}:${lane}`
    if (current.has(key)) continue
    const label = labelOf(fx, t)
    if (label !== null) current.set(key, { fx, label, lane })
  }

  return (
    <div className="pointer-events-none absolute inset-0" style={{ zIndex: 1300 }}>
      {/* Own presence scope: the scene's AnimatePresence initial={false} (PlayerScreen) would
          otherwise reach these texts and make them jump to their last keyframe, opacity 0. */}
      <AnimatePresence>
        {[...current.values()].map(({ fx, label, lane }) => {
          const anchor = anchors.get(fx.targetId)
          if (!anchor) return null
          const y = lane === 'number' ? anchor.y + NUMBER_DROP : anchor.y
          return (
            <FloatingText
              key={fx.id}
              fx={fx}
              label={label}
              anchor={{ x: anchor.x, y }}
              onDone={() => remove(fx.id)}
            />
          )
        })}
      </AnimatePresence>
    </div>
  )
}
