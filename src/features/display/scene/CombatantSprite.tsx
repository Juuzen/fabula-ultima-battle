import { motion, useReducedMotion } from 'motion/react'
import { useEffect, useRef } from 'react'

import { isInCrisis, isKnockedOut, type Combatant } from '@/domain'
import { useAssetUrl } from '@/infra/assets/assetResolver'

import { useLatestHit } from '../fx/fxContext'
import { StatusIcons } from '../hud/StatusIcons'
import type { Slot } from './formation'
import { PlaceholderSprite } from './PlaceholderSprite'
import { SPRITE_BOX } from './spriteBox'

type Props = {
  combatant: Combatant
  slot: Slot
  /** Seconds before the entrance animation starts (staggered per formation). */
  entranceDelay?: number
}

const SHAKE: Keyframe[] = [0, -16, 14, -10, 8, -4, 0].map((x) => ({
  transform: `translateX(${x}px)`,
}))
// White hit flash on any sprite: brightening alone would turn a blue sprite cyan,
// so saturation is dropped at the peak.
const FLASH: Keyframe[] = [
  { filter: 'brightness(1) saturate(1)' },
  { filter: 'brightness(2.2) saturate(0)' },
  { filter: 'brightness(1) saturate(1)' },
]
const HEAL_GLOW: Keyframe[] = [
  { filter: 'drop-shadow(0 0 0 rgba(90,255,170,0))' },
  { filter: 'drop-shadow(0 0 26px rgba(90,255,170,.95))' },
  { filter: 'drop-shadow(0 0 0 rgba(90,255,170,0))' },
]

/**
 * Shakes and flashes on damage, glows green on heal/revive. Uses the native Web Animations
 * API with `fill: 'none'`: once an effect ends nothing is left on the element (no leftover
 * filter keeping an extra GPU layer alive, which could glitch when the scene re-composites).
 */
function useHitReaction(combatantId: string) {
  const ref = useRef<HTMLDivElement>(null)
  const hit = useLatestHit(combatantId)
  const reduceMotion = useReducedMotion()
  const hitId = hit?.id
  const hitKind = hit?.kind

  useEffect(() => {
    const root = ref.current
    if (hitId === undefined || reduceMotion || !root?.animate) return
    const shake = root.querySelector<HTMLElement>('[data-shake]')
    const flash = root.querySelector<HTMLElement>('[data-flash]')
    const running: Animation[] = []
    if (hitKind === 'damage') {
      if (shake) running.push(shake.animate(SHAKE, { duration: 450, easing: 'ease-out' }))
      if (flash) running.push(flash.animate(FLASH, { duration: 350 }))
    } else if (flash) {
      running.push(flash.animate(HEAL_GLOW, { duration: 900 }))
    }
    // A newer hit replaces this one instead of overlapping it.
    return () => running.forEach((a) => a.cancel())
  }, [hitId, hitKind, reduceMotion])

  return ref
}

/** One combatant on the battlefield, anchored by its feet at `slot`. */
export function CombatantSprite({ combatant, slot, entranceDelay = 0 }: Props) {
  const url = useAssetUrl(combatant.spriteAssetId)
  const ko = isKnockedOut(combatant)
  const crisis = isInCrisis(combatant)
  const hitRef = useHitReaction(combatant.id)

  const stateClass = ko ? 'sprite-ko' : ''
  const left = slot.x - SPRITE_BOX.width / 2
  const top = slot.y - SPRITE_BOX.height
  // Enemies come in from the left edge, the party from the right.
  const enterFrom = combatant.side === 'enemy' ? -160 : 160

  return (
    <motion.div
      ref={hitRef}
      data-testid={`sprite-${combatant.id}`}
      data-state={ko ? 'ko' : crisis ? 'crisis' : 'ok'}
      className="absolute"
      style={{
        width: SPRITE_BOX.width,
        height: SPRITE_BOX.height,
        zIndex: slot.zIndex,
        scale: slot.scale,
        transformOrigin: 'bottom center',
      }}
      initial={{ opacity: 0, x: enterFrom, left, top }}
      // left/top animate too, so reordering or adding someone slides the others into place.
      animate={{ opacity: 1, x: 0, left, top }}
      exit={{ opacity: 0, transition: { duration: 0.5 } }}
      transition={{
        opacity: { duration: 0.5, delay: entranceDelay },
        x: { duration: 0.6, delay: entranceDelay, ease: 'easeOut' },
        left: { duration: 0.4, ease: 'easeInOut' },
        top: { duration: 0.4, ease: 'easeInOut' },
      }}
    >
      {/* Ground shadow */}
      <div className="absolute -bottom-3 left-1/2 h-6 w-36 -translate-x-1/2 rounded-[50%] bg-black/45 blur-sm" />

      {/* Crisis aura: a separate element pulsing in opacity only (no animated filter). */}
      {crisis && (
        <div
          data-testid="crisis-aura"
          aria-hidden="true"
          className="crisis-aura pointer-events-none absolute -inset-6 rounded-[45%]"
        />
      )}

      <div data-shake className="relative h-full w-full">
        <div data-flash className="h-full w-full">
          <div
            className={`sprite-state h-full w-full ${stateClass}`}
            // Mirroring applies to real artwork only: the placeholder is symmetric and has text.
            style={url && combatant.flipSprite ? { transform: 'scaleX(-1)' } : undefined}
          >
            {url ? (
              <img
                src={url}
                alt=""
                draggable={false}
                className="h-full w-full object-contain object-bottom [image-rendering:pixelated]"
              />
            ) : (
              <PlaceholderSprite name={combatant.name} side={combatant.side} />
            )}
          </div>
        </div>
      </div>

      {/* Enemies show statuses on their nameplate (see NameplateLayer). */}
      {combatant.side === 'ally' && !ko && (
        <div className="absolute -top-8 left-1/2 -translate-x-1/2">
          <StatusIcons statuses={combatant.statuses} size={26} />
        </div>
      )}
    </motion.div>
  )
}
