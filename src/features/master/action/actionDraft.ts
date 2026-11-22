import { create } from 'zustand'

import type { Ability, ActionKind, CombatantId, EffectId, StatusId } from '@/domain'

/**
 * The action being composed ("action mode": an actor is set, the cards become targets and
 * the action bar is docked). Kept outside the battle state: it is a draft, not part of the
 * battle (no undo, no sync, not persisted).
 */
type ActionDraftState = {
  actorId: CombatantId | ''
  name: string
  effect: EffectId
  kind: ActionKind
  /** Kept as typed text, like every number field. */
  mpCost: string
  statuses: StatusId[]
  /** Selected targets, with the amount typed for each. */
  targets: Record<CombatantId, string>
  /** Bumped by "Act" on a combatant card, so the panel can scroll into view. */
  focusRequest: number
  /** Saved ability picked from the actor's sheet; '' = free action. */
  abilityId: string
  /** The ability's reminders, shown as field hints only (never applied). */
  mpCostHint: number | null
  amountHint: number | null

  setActor: (id: CombatantId | '') => void
  /** Prefills name, effect, kind and statuses from a saved ability; null = free action. */
  applyAbility: (ability: Ability | null) => void
  setName: (name: string) => void
  setEffect: (effect: EffectId) => void
  setKind: (kind: ActionKind) => void
  setMpCost: (mpCost: string) => void
  toggleStatus: (status: StatusId) => void
  toggleTarget: (id: CombatantId) => void
  setAmount: (id: CombatantId, amount: string) => void
  /** "Act" on a combatant card: enters action mode with that actor (again on the same = exit). */
  actAs: (id: CombatantId) => void
  /** Leaves action mode and forgets the draft. */
  exit: () => void
}

const NO_ABILITY = { abilityId: '', mpCostHint: null, amountHint: null }

const EMPTY_DRAFT = {
  actorId: '' as const,
  name: '',
  effect: 'slash' as const,
  kind: 'damage' as const,
  mpCost: '',
  statuses: [],
  targets: {},
  ...NO_ABILITY,
}

export const useActionDraft = create<ActionDraftState>()((set) => ({
  actorId: '',
  name: '',
  effect: 'slash',
  kind: 'damage',
  mpCost: '',
  statuses: [],
  targets: {},
  focusRequest: 0,
  abilityId: '',
  mpCostHint: null,
  amountHint: null,

  setActor: (actorId) => set({ actorId, ...NO_ABILITY }),
  applyAbility: (ability) =>
    set(
      ability
        ? {
            abilityId: ability.id,
            name: ability.name,
            effect: ability.effect,
            kind: ability.kind,
            statuses: [...ability.statuses],
            mpCostHint: ability.mpCostHint,
            amountHint: ability.amountHint,
          }
        : NO_ABILITY,
    ),
  setName: (name) => set({ name }),
  setEffect: (effect) => set({ effect }),
  setKind: (kind) => set({ kind }),
  setMpCost: (mpCost) => set({ mpCost }),
  toggleStatus: (status) =>
    set((s) => ({
      statuses: s.statuses.includes(status)
        ? s.statuses.filter((x) => x !== status)
        : [...s.statuses, status],
    })),
  toggleTarget: (id) =>
    set((s) => {
      const targets = { ...s.targets }
      if (id in targets) delete targets[id]
      else targets[id] = ''
      return { targets }
    }),
  setAmount: (id, amount) => set((s) => ({ targets: { ...s.targets, [id]: amount } })),
  actAs: (actorId) =>
    set((s) =>
      s.actorId === actorId
        ? EMPTY_DRAFT
        : { ...EMPTY_DRAFT, actorId, focusRequest: s.focusRequest + 1 },
    ),
  exit: () => set(EMPTY_DRAFT),
}))
