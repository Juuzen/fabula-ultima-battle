import { AnimatePresence } from 'motion/react'

import { customEffectId, isBuiltinEffect, type CombatantId, type CustomEffect } from '@/domain'
import { useAssetUrl } from '@/infra/assets/assetResolver'

import { useChoreoStore } from '../choreography/choreoStore'
import { EFFECT_TIMING } from '../choreography/timeline'
import type { Anchor } from '../fx/FloatingTextLayer'
import { useLibraryFeed } from '../state/libraryFeed'
import { BUILTIN_EFFECT_COMPONENTS } from './effectRegistry'
import { EFFECT_BOX } from './effectBox'

/** A GM-made effect: its video, centred on the target, sized by the effect's scale. */
function CustomEffectVideo({ effect }: { effect: CustomEffect }) {
  const url = useAssetUrl(effect.videoAssetId)
  if (!url) return null
  const size = EFFECT_BOX * effect.scale
  const offset = (EFFECT_BOX - size) / 2
  return (
    <video
      src={url}
      autoPlay
      muted
      playsInline
      aria-hidden="true"
      className="absolute object-contain"
      style={{ left: offset, top: offset, width: size, height: size }}
    />
  )
}

/**
 * Plays the current action's effect on each of its targets, during the "effect" step: a
 * built-in drawing, or the video of a custom effect (its sound is played by the sound cues).
 */
export function EffectLayer({ centres }: { centres: ReadonlyMap<CombatantId, Anchor> }) {
  const stage = useChoreoStore((s) => s.stage)
  const customEffects = useLibraryFeed((s) => s.customEffects)
  // No visual effect chosen: the hit lands without a drawing.
  if (!stage || stage.step !== 'effect' || !stage.effect) return null

  const effect = stage.effect
  const Builtin = isBuiltinEffect(effect) ? BUILTIN_EFFECT_COMPONENTS[effect] : null
  const duration = isBuiltinEffect(effect) ? EFFECT_TIMING[effect].durationMs / 1000 : 0
  const custom = Builtin ? null : (customEffects.get(customEffectId(effect) ?? '') ?? null)
  // A custom effect deleted meanwhile: nothing to draw.
  if (!Builtin && !custom) return null

  return (
    <div
      className="pointer-events-none absolute inset-0"
      style={{ zIndex: 1250 }}
      data-testid="effect-layer"
    >
      {/* Own presence scope: PlayerScreen's AnimatePresence initial={false} would otherwise
          reach these effects and make them start on their last keyframe (opacity 0). */}
      <AnimatePresence>
        {stage.targetIds.map((id) => {
          const centre = centres.get(id)
          if (!centre) return null
          return (
            <div
              key={`${stage.runId}:${id}`}
              data-testid={`effect-${stage.effect}-${id}`}
              className="absolute"
              style={{
                left: centre.x - EFFECT_BOX / 2,
                top: centre.y - EFFECT_BOX / 2,
                width: EFFECT_BOX,
                height: EFFECT_BOX,
              }}
            >
              {custom ? (
                <CustomEffectVideo effect={custom} />
              ) : (
                Builtin && <Builtin duration={duration} fromSky={centre.y} />
              )}
            </div>
          )
        })}
      </AnimatePresence>
    </div>
  )
}
