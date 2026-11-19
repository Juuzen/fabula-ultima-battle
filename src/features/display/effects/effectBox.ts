/** Props every effect receives. Coordinates are local: (0, 0) is the target's centre. */
export type EffectProps = {
  /** Total length of the effect, in seconds. */
  duration: number
  /** Distance from the top of the stage to the target's centre (for effects from the sky). */
  fromSky: number
}

/** Effects draw in a 400×400 box centred on the target. */
export const EFFECT_BOX = 400
