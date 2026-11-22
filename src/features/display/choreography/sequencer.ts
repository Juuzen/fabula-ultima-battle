import type { BattleEvent, BattleState, EffectRef } from '@/domain'

import type { Stage } from './choreoStore'
import { SEQUENCE, timingOf, type EffectTiming } from './timeline'

/** With more updates than this waiting, sequences are skipped to catch up with the Master. */
export const MAX_BACKLOG = 3

type Options = {
  /** Shows a state and plays its quick effects (numbers, shake…). */
  apply: (state: BattleState, events: BattleEvent[]) => void
  /** Publishes the step of the action being played (null = none). */
  setStage: (stage: Stage | null) => void
  /** True when animations should be skipped (OS "reduce motion"). */
  reducedMotion?: () => boolean
  /** Timing of an effect; custom effects need the library, so the caller can provide it. */
  timing?: (effect: EffectRef | null) => EffectTiming
  /**
   * An update has landed (on impact for actions, at once otherwise), with all its events,
   * the opening ACTION_PERFORMED included: the moment to play its sounds.
   */
  onLand?: (events: BattleEvent[]) => void
  wait?: (ms: number) => Promise<void>
}

export type Sequencer = {
  /** Queues an update from the Master. Updates are always shown in arrival order. */
  enqueue: (state: BattleState, events: BattleEvent[]) => void
  /** Stops playing; anything still queued is applied at once (nothing is lost). */
  dispose: () => void
}

const defaultWait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))

/**
 * The Display's director. Plain updates are shown at once; an update that starts with
 * ACTION_PERFORMED is played as a sequence (advance, cast, effect, retreat) and its new
 * state is shown only when the hit lands, so bars and nameplates change on impact.
 * Updates arriving meanwhile wait their turn, so the order is never mixed up.
 */
export function createSequencer({
  apply,
  setStage,
  reducedMotion = () => false,
  timing = (effect) => timingOf(effect),
  onLand = () => {},
  wait = defaultWait,
}: Options): Sequencer {
  const queue: { state: BattleState; events: BattleEvent[] }[] = []
  let running = false
  let disposed = false
  let runId = 0

  /**
   * With an actor: advance, cast, effect (or a bare hit), retreat. Without one (the GM acts)
   * nobody moves: the banner and the effect go straight to the targets.
   */
  const play = async (state: BattleState, events: BattleEvent[]) => {
    const opening = events[0]
    if (opening?.type !== 'ACTION_PERFORMED') return
    const { durationMs, impactAt } = timing(opening.effect)
    const impactMs = Math.round(durationMs * impactAt)
    const withActor = opening.actorId !== null
    const base = {
      runId: ++runId,
      actorId: opening.actorId,
      name: opening.name,
      effect: opening.effect,
      targetIds: opening.targetIds,
    }

    // Each pause returns false once disposed, so an interrupted sequence stops right there.
    const pause = async (ms: number) => {
      await wait(ms)
      return !disposed
    }

    if (withActor) {
      setStage({ ...base, step: 'advance' })
      if (!(await pause(SEQUENCE.advance))) return
      setStage({ ...base, step: 'cast' })
      if (!(await pause(SEQUENCE.cast))) return
    }
    setStage({ ...base, step: 'effect' })
    if (!(await pause(impactMs))) return
    apply(state, events.slice(1)) // the hit lands
    onLand(events)
    if (!(await pause(durationMs - impactMs + SEQUENCE.hold))) return
    if (withActor) {
      setStage({ ...base, step: 'retreat' })
      if (!(await pause(SEQUENCE.retreat))) return
    }
    setStage(null)
  }

  /** A GM action with neither a name nor an effect has nothing to show: just the numbers. */
  const hasSequence = (events: BattleEvent[]) => {
    const opening = events[0]
    if (opening?.type !== 'ACTION_PERFORMED') return false
    return opening.actorId !== null || opening.effect !== null || opening.name !== ''
  }

  const run = async () => {
    running = true
    while (queue.length > 0) {
      if (disposed) break
      const { state, events } = queue.shift()!
      const isAction = events[0]?.type === 'ACTION_PERFORMED'
      const behind = queue.length >= MAX_BACKLOG
      if (isAction && hasSequence(events) && !behind && !reducedMotion()) {
        await play(state, events)
      } else {
        apply(state, isAction ? events.slice(1) : events)
        onLand(events)
      }
    }
    running = false
  }

  return {
    enqueue(state, events) {
      if (disposed) return
      queue.push({ state, events })
      if (!running) void run()
    },
    dispose() {
      disposed = true
      const last = queue.at(-1)
      if (last) apply(last.state, [])
      queue.length = 0
      setStage(null)
    },
  }
}
