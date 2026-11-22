import type { Action, ActionTarget, Combatant, CombatantId } from '@/domain'
import { parseWholeNumber } from '@/shared/lib/numbers'

import type { TargetDraft } from './actionDraft'

export type ActionProblem =
  /** No target checked. */
  | 'chooseTargets'
  /** A checked target has neither an amount nor a status. */
  | 'emptyTarget'
  /** An amount or the MP cost is not a whole number. */
  | 'badNumber'
  | 'notEnoughMp'

type Draft = {
  selectedId: CombatantId | ''
  name: string
  effect: Action['effect']
  mpCost: string
  targets: Record<CombatantId, TargetDraft>
}

export type BuiltAction =
  { action: Action; problem: null } | { action: null; problem: ActionProblem }

/** Turns the composer's draft into a valid Action, or says what is missing. Pure. */
export function buildAction(draft: Draft, all: readonly Combatant[]): BuiltAction {
  const actor = draft.selectedId ? all.find((c) => c.id === draft.selectedId) : undefined

  const targets: ActionTarget[] = []
  // Removed combatants are ignored; the order follows the field.
  for (const c of all) {
    const t = draft.targets[c.id]
    if (!t) continue
    const amount = t.amount.trim() === '' ? null : parseWholeNumber(t.amount)
    if (t.amount.trim() !== '' && amount === null) return { action: null, problem: 'badNumber' }
    const change = amount === null ? null : { kind: t.kind, amount }
    if (!change && t.add.length + t.remove.length === 0) {
      return { action: null, problem: 'emptyTarget' }
    }
    targets.push({ id: c.id, change, addStatuses: t.add, removeStatuses: t.remove })
  }
  if (targets.length === 0) return { action: null, problem: 'chooseTargets' }

  // The MP cost field only exists for actors with MP: whatever is left in it must not count.
  const typed = draft.mpCost.trim()
  const mpCost = !actor || actor.maxMp === 0 || typed === '' ? 0 : parseWholeNumber(typed)
  if (mpCost === null) return { action: null, problem: 'badNumber' }
  if (actor && mpCost > actor.mp) return { action: null, problem: 'notEnoughMp' }

  return {
    problem: null,
    action: {
      actorId: actor?.id ?? null,
      name: draft.name.trim(),
      effect: draft.effect,
      mpCost,
      targets,
    },
  }
}
