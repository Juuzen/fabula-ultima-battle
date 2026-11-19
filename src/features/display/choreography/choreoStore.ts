import { create } from 'zustand'

import type { ActionKind, CombatantId, EffectId } from '@/domain'

export type StageStep = 'advance' | 'cast' | 'effect' | 'retreat'

/** The action currently being played on the Display, if any. */
export type Stage = {
  /** Increases with every sequence, so effects remount even for identical actions. */
  runId: number
  step: StageStep
  actorId: CombatantId
  name: string
  effect: EffectId
  kind: ActionKind
  targetIds: CombatantId[]
}

type ChoreoState = { stage: Stage | null; setStage: (stage: Stage | null) => void }

export const useChoreoStore = create<ChoreoState>()((set) => ({
  stage: null,
  setStage: (stage) => set({ stage }),
}))
