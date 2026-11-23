import { z } from 'zod'

import type { BattleState } from './battle'
import { isKnockedOut } from './combatant'

/**
 * How a battle ended. Victory and defeat have their own banner style (and music); flee and
 * custom are plain text, custom with the GM's own words.
 */
export const OUTCOME_KINDS = ['victory', 'defeat', 'flee', 'custom'] as const
export const OutcomeKindSchema = z.enum(OUTCOME_KINDS)
export type OutcomeKind = z.infer<typeof OutcomeKindSchema>

/** The kinds that come with music, chosen in the Audio section. */
export const OUTCOME_MUSIC_KINDS = ['victory', 'defeat'] as const
export type OutcomeMusicKind = (typeof OUTCOME_MUSIC_KINDS)[number]

export const MAX_OUTCOME_TEXT = 40

export const OutcomeSchema = z
  .object({
    kind: OutcomeKindSchema,
    /** The banner's words; empty = the kind's default ("Vittoria!"). Custom needs its own. */
    text: z.string().trim().max(MAX_OUTCOME_TEXT),
  })
  .refine((o) => o.kind !== 'custom' || o.text.length > 0, {
    message: 'a custom outcome needs its text',
    path: ['text'],
  })
export type Outcome = z.infer<typeof OutcomeSchema>

/**
 * The obvious ending, if any: every enemy KO is a victory, the whole party KO a defeat (a
 * side with nobody on it does not count). Only offered as a shortcut: the GM decides.
 */
export function suggestedOutcome(state: BattleState): 'victory' | 'defeat' | null {
  if (state.phase !== 'active') return null
  const allDown = (side: 'ally' | 'enemy') => {
    const fighters = state.combatants.filter((c) => c.side === side)
    return fighters.length > 0 && fighters.every(isKnockedOut)
  }
  if (allDown('ally')) return 'defeat'
  if (allDown('enemy')) return 'victory'
  return null
}
