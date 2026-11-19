import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { createEmptyBattle, type BattleEvent, type BattleState } from '@/domain'

import type { Stage } from './choreoStore'
import { createSequencer, MAX_BACKLOG } from './sequencer'
import { EFFECT_TIMING, SEQUENCE, sequenceLength } from './timeline'

const named = (name: string): BattleState => ({ ...createEmptyBattle(), name, phase: 'active' })

const actionEvents = (effect: 'slash' | 'fire' = 'slash'): BattleEvent[] => [
  {
    type: 'ACTION_PERFORMED',
    actorId: 'hero',
    name: 'Fendente',
    effect,
    kind: 'damage',
    targetIds: ['orc'],
  },
  { type: 'DAMAGED', id: 'orc', amount: 12, hp: 18 },
]

function setup(options: { reduced?: boolean } = {}) {
  const applied: { name: string; events: BattleEvent[] }[] = []
  const stages: (Stage | null)[] = []
  const sequencer = createSequencer({
    apply: (state, events) => applied.push({ name: state.name, events }),
    setStage: (stage) => stages.push(stage),
    reducedMotion: () => options.reduced ?? false,
  })
  const steps = () => stages.map((s) => s?.step ?? null)
  return { sequencer, applied, stages, steps }
}

/** Advances fake time and lets the sequencer's awaits resolve. */
const advance = async (ms: number) => {
  await vi.advanceTimersByTimeAsync(ms)
}

describe('sequencer', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('applies plain updates at once', () => {
    const { sequencer, applied, stages } = setup()
    sequencer.enqueue(named('a'), [{ type: 'HP_SET', id: 'orc', hp: 3 }])
    expect(applied).toEqual([{ name: 'a', events: [{ type: 'HP_SET', id: 'orc', hp: 3 }] }])
    expect(stages).toEqual([])
  })

  it('plays an action and shows its new state only when the hit lands', async () => {
    const { sequencer, applied, steps } = setup()
    sequencer.enqueue(named('after hit'), actionEvents())

    expect(steps()).toEqual(['advance'])
    await advance(SEQUENCE.advance)
    expect(steps().at(-1)).toBe('cast')
    await advance(SEQUENCE.cast)
    expect(steps().at(-1)).toBe('effect')
    expect(applied).toEqual([]) // not yet: the effect is still travelling

    const impactMs = Math.round(EFFECT_TIMING.slash.durationMs * EFFECT_TIMING.slash.impactAt)
    await advance(impactMs - 1)
    expect(applied).toEqual([])
    await advance(1)
    expect(applied).toEqual([
      { name: 'after hit', events: [{ type: 'DAMAGED', id: 'orc', amount: 12, hp: 18 }] },
    ])

    await advance(sequenceLength('slash'))
    expect(steps()).toEqual(['advance', 'cast', 'effect', 'retreat', null])
  })

  it('publishes who acts, on whom, with which effect and name', () => {
    const { sequencer, stages } = setup()
    sequencer.enqueue(named('x'), actionEvents('fire'))
    expect(stages[0]).toMatchObject({
      actorId: 'hero',
      targetIds: ['orc'],
      effect: 'fire',
      name: 'Fendente',
      kind: 'damage',
    })
  })

  it('keeps updates that arrive during a sequence in order, after it', async () => {
    const { sequencer, applied } = setup()
    sequencer.enqueue(named('action'), actionEvents())
    sequencer.enqueue(named('later'), [])
    await advance(SEQUENCE.advance + SEQUENCE.cast)
    expect(applied.map((a) => a.name)).toEqual([])

    await advance(sequenceLength('slash'))
    expect(applied.map((a) => a.name)).toEqual(['action', 'later'])
  })

  it('plays queued actions one after another', async () => {
    const { sequencer, stages } = setup()
    sequencer.enqueue(named('one'), actionEvents())
    sequencer.enqueue(named('two'), actionEvents('fire'))
    await advance(sequenceLength('slash') + sequenceLength('fire'))
    const runs = new Set(stages.filter(Boolean).map((s) => s!.runId))
    expect(runs.size).toBe(2)
  })

  it('skips sequences to catch up when too many updates are waiting', async () => {
    const { sequencer, applied, stages } = setup()
    sequencer.enqueue(named('playing'), actionEvents())
    for (let i = 0; i <= MAX_BACKLOG; i++) sequencer.enqueue(named(`burst ${i}`), actionEvents())

    // When "playing" ends, 4 updates wait: the first is applied at once to catch up…
    await advance(sequenceLength('slash'))
    expect(applied.map((a) => a.name)).toEqual(['playing', 'burst 0'])

    // …then the backlog is short again and the others are played normally.
    await advance(sequenceLength('slash') * 3)
    expect(applied.map((a) => a.name)).toEqual([
      'playing',
      'burst 0',
      'burst 1',
      'burst 2',
      'burst 3',
    ])
    expect(new Set(stages.filter(Boolean).map((s) => s!.runId)).size).toBe(4)
  })

  it('applies actions at once when the OS asks to reduce motion', () => {
    const { sequencer, applied, stages } = setup({ reduced: true })
    sequencer.enqueue(named('now'), actionEvents())
    expect(applied).toEqual([
      { name: 'now', events: [{ type: 'DAMAGED', id: 'orc', amount: 12, hp: 18 }] },
    ])
    expect(stages).toEqual([])
  })

  it('on dispose shows the latest state and stops the sequence', async () => {
    const { sequencer, applied, stages } = setup()
    sequencer.enqueue(named('action'), actionEvents())
    sequencer.enqueue(named('latest'), [])
    await advance(SEQUENCE.advance)
    sequencer.dispose()
    expect(applied.map((a) => a.name)).toEqual(['latest'])
    expect(stages.at(-1)).toBeNull()

    await advance(sequenceLength('slash'))
    expect(applied.map((a) => a.name)).toEqual(['latest']) // nothing after dispose
  })
})
