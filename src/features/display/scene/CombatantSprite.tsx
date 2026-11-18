import { isInCrisis, isKnockedOut, type Combatant } from '@/domain'
import { useAssetUrl } from '@/infra/assets/assetResolver'

import { StatusIcons } from '../hud/StatusIcons'
import type { Slot } from './formation'
import { PlaceholderSprite } from './PlaceholderSprite'

import { SPRITE_BOX } from './spriteBox'

type Props = { combatant: Combatant; slot: Slot }

/** One combatant on the battlefield, anchored by its feet at `slot`. */
export function CombatantSprite({ combatant, slot }: Props) {
  const url = useAssetUrl(combatant.spriteAssetId)
  const ko = isKnockedOut(combatant)
  const crisis = isInCrisis(combatant)

  const stateClass = ko ? 'sprite-ko' : crisis ? 'sprite-crisis' : ''

  return (
    <div
      data-testid={`sprite-${combatant.id}`}
      data-state={ko ? 'ko' : crisis ? 'crisis' : 'ok'}
      className="absolute"
      style={{
        left: slot.x - SPRITE_BOX.width / 2,
        top: slot.y - SPRITE_BOX.height,
        width: SPRITE_BOX.width,
        height: SPRITE_BOX.height,
        zIndex: slot.zIndex,
        transform: `scale(${slot.scale})`,
        transformOrigin: 'bottom center',
      }}
    >
      {/* Ground shadow */}
      <div className="absolute -bottom-3 left-1/2 h-6 w-36 -translate-x-1/2 rounded-[50%] bg-black/45 blur-sm" />

      <div
        className={`relative h-full w-full ${stateClass}`}
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

      {/* Enemies show statuses on their nameplate (see NameplateLayer). */}
      {combatant.side === 'ally' && !ko && (
        <div className="absolute -top-8 left-1/2 -translate-x-1/2">
          <StatusIcons statuses={combatant.statuses} size={26} />
        </div>
      )}
    </div>
  )
}
