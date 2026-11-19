import { AnimatePresence } from 'motion/react'

import type { CombatantId } from '@/domain'

import { useChoreoStore } from '../choreography/choreoStore'
import { EFFECT_TIMING } from '../choreography/timeline'
import type { Anchor } from '../fx/FloatingTextLayer'
import { BUILTIN_EFFECT_COMPONENTS } from './builtinEffects'
import { EFFECT_BOX } from './effectBox'

/**
 * Plays the current action's effect on each of its targets, during the "effect" step.
 * Phase 7 will let an effect use a .webm video instead of the built-in drawing.
 */
export function EffectLayer({ centres }: { centres: ReadonlyMap<CombatantId, Anchor> }) {
  const stage = useChoreoStore((s) => s.stage)
  if (!stage || stage.step !== 'effect') return null

  const Effect = BUILTIN_EFFECT_COMPONENTS[stage.effect]
  const duration = EFFECT_TIMING[stage.effect].durationMs / 1000

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
              <Effect duration={duration} fromSky={centre.y} />
            </div>
          )
        })}
      </AnimatePresence>
    </div>
  )
}
