import { motion, useAnimate, useReducedMotion } from 'motion/react'
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

const SHAKE = { x: [0, -16, 14, -10, 8, -4, 0] }
const FLASH = { filter: ['brightness(1)', 'brightness(2.6)', 'brightness(1)'] }
const HEAL_GLOW = {
  filter: [
    'drop-shadow(0 0 0 rgba(90,255,170,0))',
    'drop-shadow(0 0 26px rgba(90,255,170,.95))',
    'drop-shadow(0 0 0 rgba(90,255,170,0))',
  ],
}
const REVIVE_GLOW = {
  filter: [
    'drop-shadow(0 0 0 rgba(255,215,90,0))',
    'drop-shadow(0 0 30px rgba(255,215,90,.95))',
    'drop-shadow(0 0 0 rgba(255,215,90,0))',
  ],
}

/** Shakes and flashes on damage, glows green on heal and gold on revive. */
function useHitReaction(combatantId: string) {
  const [scope, animate] = useAnimate<HTMLDivElement>()
  const hit = useLatestHit(combatantId)
  const reduceMotion = useReducedMotion()
  const hitId = hit?.id
  const hitKind = hit?.kind
  // Fx ids only grow. When the latest hit leaves the queue, an older one still queued becomes
  // "latest" again: it was already played, so only ids above this one may animate.
  const lastHandled = useRef(0)

  useEffect(() => {
    if (hitId === undefined || hitId <= lastHandled.current) return
    lastHandled.current = hitId
    if (reduceMotion || !scope.current) return
    if (hitKind === 'damage') {
      void animate('[data-shake]', SHAKE, { duration: 0.45, ease: 'easeOut' })
      void animate('[data-flash]', FLASH, { duration: 0.35 })
    } else if (hitKind === 'revive') {
      void animate('[data-flash]', REVIVE_GLOW, { duration: 1.1 })
    } else {
      void animate('[data-flash]', HEAL_GLOW, { duration: 0.9 })
    }
  }, [hitId, hitKind, reduceMotion, animate, scope])

  return scope
}

/** One combatant on the battlefield, anchored by its feet at `slot`. */
export function CombatantSprite({ combatant, slot, entranceDelay = 0 }: Props) {
  const url = useAssetUrl(combatant.spriteAssetId)
  const ko = isKnockedOut(combatant)
  const crisis = isInCrisis(combatant)
  const scope = useHitReaction(combatant.id)

  const stateClass = ko ? 'sprite-ko' : crisis ? 'sprite-crisis' : ''
  const left = slot.x - SPRITE_BOX.width / 2
  const top = slot.y - SPRITE_BOX.height
  // Enemies come in from the left edge, the party from the right.
  const enterFrom = combatant.side === 'enemy' ? -160 : 160

  return (
    <motion.div
      ref={scope}
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
