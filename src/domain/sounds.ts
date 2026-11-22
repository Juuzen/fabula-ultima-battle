import type { AssetId, CustomEffect, SoundSettings } from './asset'
import { customEffectId, isBuiltinEffect, type EffectRef } from './effect'
import type { BattleEvent } from './events'

/** Sound of an effect: a custom effect's own, or the one assigned to a built-in effect. */
export function effectSound(
  effect: EffectRef | null,
  settings: SoundSettings,
  customEffects: ReadonlyMap<string, CustomEffect>,
): AssetId | null {
  if (!effect) return null
  if (isBuiltinEffect(effect)) return settings.effects[effect]
  const id = customEffectId(effect)
  return (id && customEffects.get(id)?.soundAssetId) ?? null
}

/**
 * What the Display plays for an update. An action sounds like its own sound, else its effect's,
 * else the default hit or heal sound; a quick change (e.g. "-10 PV" from the field card) gets
 * the default ones. A KO always adds its sound, the start of the battle its own. The Display
 * plays them when the update lands: on impact for actions, at once otherwise. Pure.
 */
export function soundCues(
  events: readonly BattleEvent[],
  settings: SoundSettings,
  customEffects: ReadonlyMap<string, CustomEffect> = new Map(),
): AssetId[] {
  const cues: AssetId[] = []
  const push = (id: AssetId | null) => {
    if (id && !cues.includes(id)) cues.push(id)
  }

  if (events.some((e) => e.type === 'BATTLE_STARTED')) push(settings.system.battleStart)

  const opening = events[0]?.type === 'ACTION_PERFORMED' ? events[0] : null
  const own = opening
    ? (opening.soundAssetId ?? effectSound(opening.effect, settings, customEffects))
    : null
  // MP damage is a hit only inside an action, on someone other than the actor (whose MP
  // went on the cost). A quick "spend MP" from the field card is just bookkeeping.
  const isHit = (e: BattleEvent) =>
    e.type === 'DAMAGED' || (e.type === 'MP_SPENT' && opening !== null && e.id !== opening.actorId)
  const isHeal = (e: BattleEvent) => e.type === 'HEALED' || e.type === 'MP_RESTORED'
  if (own) push(own)
  else if (events.some(isHit)) push(settings.system.hit)
  else if (events.some(isHeal)) push(settings.system.heal)
  if (events.some((e) => e.type === 'KNOCKED_OUT')) push(settings.system.ko)

  return cues
}
