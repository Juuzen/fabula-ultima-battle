import { create } from 'zustand'

import type { ActionKind, CombatantId, EffectId, StatusId } from '@/domain'

/**
 * The action being composed in the Master's "Action" panel. Kept outside the battle state:
 * it is a draft, not part of the battle (no undo, no sync, not persisted).
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

  setActor: (id: CombatantId | '') => void
  setName: (name: string) => void
  setEffect: (effect: EffectId) => void
  setKind: (kind: ActionKind) => void
  setMpCost: (mpCost: string) => void
  toggleStatus: (status: StatusId) => void
  toggleTarget: (id: CombatantId) => void
  setAmount: (id: CombatantId, amount: string) => void
  /** "Act" on a combatant card: that combatant becomes the actor and the panel is focused. */
  actAs: (id: CombatantId) => void
  /** After performing: amounts are cleared, the rest is kept to repeat similar actions. */
  clearAmounts: () => void
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

  setActor: (actorId) => set({ actorId }),
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
  actAs: (actorId) => set((s) => ({ actorId, focusRequest: s.focusRequest + 1 })),
  clearAmounts: () =>
    set((s) => ({
      targets: Object.fromEntries(Object.keys(s.targets).map((id) => [id, ''])),
    })),
}))
