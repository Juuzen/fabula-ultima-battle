import { create } from 'zustand'

import type { CombatantId, EffectId } from '@/domain'

export type StageStep = 'advance' | 'cast' | 'effect' | 'retreat'

/** The action currently being played on the Display, if any. */
export type Stage = {
  /** Increases with every sequence, so effects remount even for identical actions. */
  runId: number
  step: StageStep
  /** null = the GM acts: nobody steps forward. */
  actorId: CombatantId | null
  name: string
  /** null = no visual effect, only the impact. */
  effect: EffectId | null
  targetIds: CombatantId[]
}

type ChoreoState = { stage: Stage | null; setStage: (stage: Stage | null) => void }

export const useChoreoStore = create<ChoreoState>()((set) => ({
  stage: null,
  setStage: (stage) => set({ stage }),
}))
