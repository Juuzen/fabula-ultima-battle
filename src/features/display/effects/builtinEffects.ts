import type { ComponentType } from 'react'

import type { EffectId } from '@/domain'

import { Fire, Ice, Impact, Light, Shadow, Slash, Thunder } from './BuiltinEffects'
import type { EffectProps } from './effectBox'

/** Built-in drawing for each effect id. */
export const BUILTIN_EFFECT_COMPONENTS: Record<EffectId, ComponentType<EffectProps>> = {
  slash: Slash,
  impact: Impact,
  fire: Fire,
  ice: Ice,
  thunder: Thunder,
  light: Light,
  shadow: Shadow,
}
