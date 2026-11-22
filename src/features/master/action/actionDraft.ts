import { create } from 'zustand'

import type { Ability, ActionKind, CombatantId, EffectId, StatusId } from '@/domain'

/** One target's outcome, as typed. An empty amount means "no PV/PM change". */
export type TargetDraft = {
  kind: ActionKind
  /** Kept as typed text, like every number field. */
  amount: string
  add: StatusId[]
  remove: StatusId[]
}

export type DetailView = 'abilities' | 'compose'

/**
 * The Screen Control cockpit's selection and the action being composed. Kept outside the
 * battle state: it is a draft, not part of the battle (no sync, not persisted).
 *
 * - No one selected: the detail pane composes the GM's own action.
 * - Someone selected: it lists their abilities; picking one (or "free action") composes it.
 */
type ActionDraftState = {
  /** '' = nobody: the GM acts. */
  selectedId: CombatantId | ''
  view: DetailView
  /** Saved ability being used; '' = free action. */
  abilityId: string
  name: string
  effect: EffectId | null
  /** Kept as typed text. */
  mpCost: string
  /** The ability's reminders, shown as field hints only (never applied). */
  mpCostHint: number | null
  amountHint: number | null
  /** What a newly checked target starts with (the ability's kind and statuses). */
  defaults: { kind: ActionKind; add: StatusId[] }
  targets: Record<CombatantId, TargetDraft>

  /** Selects a combatant (again on the same one = back to the GM). */
  select: (id: CombatantId | '') => void
  /** Starts composing a saved ability, or a free action (null). */
  openAbility: (ability: Ability | null) => void
  /** Back to the selected combatant's ability list. */
  back: () => void
  setName: (name: string) => void
  setEffect: (effect: EffectId | null) => void
  setMpCost: (mpCost: string) => void
  toggleTarget: (id: CombatantId) => void
  setTargetKind: (id: CombatantId, kind: ActionKind) => void
  setTargetAmount: (id: CombatantId, amount: string) => void
  /** Toggles a status to add or to remove on a target (never both). */
  toggleTargetStatus: (id: CombatantId, status: StatusId, mode: 'add' | 'remove') => void
  /** After acting: the same actor's ability list, or a fresh GM action. */
  done: () => void
}

const DEFAULTS = { kind: 'damage' as const, add: [] as StatusId[] }

const EMPTY_COMPOSER = {
  abilityId: '',
  name: '',
  effect: null,
  mpCost: '',
  mpCostHint: null,
  amountHint: null,
  defaults: DEFAULTS,
  targets: {},
}

const toggle = <T>(list: readonly T[], item: T): T[] =>
  list.includes(item) ? list.filter((x) => x !== item) : [...list, item]

export const useActionDraft = create<ActionDraftState>()((set) => ({
  selectedId: '',
  view: 'compose',
  ...EMPTY_COMPOSER,

  select: (id) =>
    set((s) => {
      const next = s.selectedId === id ? '' : id
      return { ...EMPTY_COMPOSER, selectedId: next, view: next ? 'abilities' : 'compose' }
    }),

  openAbility: (ability) =>
    set((s) => {
      const defaults = ability
        ? { kind: ability.kind ?? DEFAULTS.kind, add: [...ability.statuses] }
        : DEFAULTS
      // Targets already checked follow the ability's outcome (amounts stay as typed).
      const targets = Object.fromEntries(
        Object.entries(s.targets).map(([id, t]) => [
          id,
          { ...t, kind: defaults.kind, add: [...defaults.add], remove: [] },
        ]),
      )
      return {
        view: 'compose',
        abilityId: ability?.id ?? '',
        name: ability?.name ?? '',
        effect: ability?.effect ?? null,
        mpCost: '',
        mpCostHint: ability?.mpCostHint ?? null,
        amountHint: ability?.amountHint ?? null,
        defaults,
        targets,
      }
    }),

  back: () => set({ ...EMPTY_COMPOSER, view: 'abilities' }),
  setName: (name) => set({ name }),
  setEffect: (effect) => set({ effect }),
  setMpCost: (mpCost) => set({ mpCost }),

  toggleTarget: (id) =>
    set((s) => {
      const targets = { ...s.targets }
      if (id in targets) delete targets[id]
      else targets[id] = { kind: s.defaults.kind, amount: '', add: [...s.defaults.add], remove: [] }
      return { targets }
    }),

  setTargetKind: (id, kind) =>
    set((s) =>
      s.targets[id] ? { targets: { ...s.targets, [id]: { ...s.targets[id], kind } } } : s,
    ),

  setTargetAmount: (id, amount) =>
    set((s) =>
      s.targets[id] ? { targets: { ...s.targets, [id]: { ...s.targets[id], amount } } } : s,
    ),

  toggleTargetStatus: (id, status, mode) =>
    set((s) => {
      const target = s.targets[id]
      if (!target) return s
      const other = mode === 'add' ? 'remove' : 'add'
      const next = {
        ...target,
        [mode]: toggle(target[mode], status),
        [other]: target[other].filter((x) => x !== status),
      }
      return { targets: { ...s.targets, [id]: next } }
    }),

  done: () => set((s) => ({ ...EMPTY_COMPOSER, view: s.selectedId ? 'abilities' : 'compose' })),
}))
