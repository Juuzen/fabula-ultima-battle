import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { createEmptyBattle, customEffectRef, type BattleEvent, type BattleState } from '@/domain'

import type { Stage } from './choreoStore'
import { createSequencer, MAX_BACKLOG } from './sequencer'
import { EFFECT_TIMING, NO_EFFECT_TIMING, SEQUENCE, sequenceLength, timingOf } from './timeline'

const named = (name: string): BattleState => ({ ...createEmptyBattle(), name, phase: 'active' })

const actionEvents = (
  effect: 'slash' | 'fire' | null = 'slash',
  actorId: string | null = 'hero',
  name = 'Fendente',
): BattleEvent[] => [
  { type: 'ACTION_PERFORMED', actorId, name, effect, soundAssetId: null, targetIds: ['orc'] },
  { type: 'DAMAGED', id: 'orc', amount: 12, hp: 18 },
]

function setup(
  options: { reduced?: boolean; timing?: Parameters<typeof createSequencer>[0]['timing'] } = {},
) {
  const applied: { name: string; events: BattleEvent[] }[] = []
  const landed: BattleEvent['type'][][] = []
  const stages: (Stage | null)[] = []
  const sequencer = createSequencer({
    apply: (state, events) => applied.push({ name: state.name, events }),
    setStage: (stage) => stages.push(stage),
    reducedMotion: () => options.reduced ?? false,
    timing: options.timing,
    onLand: (events) => landed.push(events.map((e) => e.type)),
  })
  const steps = () => stages.map((s) => s?.step ?? null)
  return { sequencer, applied, landed, stages, steps }
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
    })
  })

  it('without a visual effect, the actor still steps forward and the hit lands soon', async () => {
    const { sequencer, applied, steps, stages } = setup()
    sequencer.enqueue(named('bare'), actionEvents(null))
    await advance(SEQUENCE.advance + SEQUENCE.cast)
    expect(stages.at(-1)).toMatchObject({ step: 'effect', effect: null })
    await advance(Math.round(NO_EFFECT_TIMING.durationMs * NO_EFFECT_TIMING.impactAt))
    expect(applied.map((a) => a.name)).toEqual(['bare'])
    await advance(sequenceLength(null))
    expect(steps()).toEqual(['advance', 'cast', 'effect', 'retreat', null])
  })

  it('a GM action (no actor) skips the moves: banner and effect only', async () => {
    const { sequencer, applied, steps } = setup()
    sequencer.enqueue(named('gm'), actionEvents('fire', null, 'Trappola'))
    expect(steps()).toEqual(['effect'])
    await advance(Math.round(EFFECT_TIMING.fire.durationMs * EFFECT_TIMING.fire.impactAt))
    expect(applied.map((a) => a.name)).toEqual(['gm'])
    await advance(sequenceLength('fire', false))
    expect(steps()).toEqual(['effect', null])
  })

  it('a GM action with neither name nor effect is applied at once', () => {
    const { sequencer, applied, stages } = setup()
    sequencer.enqueue(named('quick'), actionEvents(null, null, ''))
    expect(applied).toEqual([
      { name: 'quick', events: [{ type: 'DAMAGED', id: 'orc', amount: 12, hp: 18 }] },
    ])
    expect(stages).toEqual([])
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

  it('reports each update as it lands, with its opening event, for the sounds', async () => {
    const { sequencer, landed } = setup()
    sequencer.enqueue(named('a'), [{ type: 'BATTLE_STARTED' }])
    expect(landed).toEqual([['BATTLE_STARTED']])
    sequencer.enqueue(named('b'), actionEvents())
    await advance(SEQUENCE.advance + SEQUENCE.cast)
    expect(landed).toHaveLength(1) // the effect is still travelling
    await advance(Math.round(EFFECT_TIMING.slash.durationMs * EFFECT_TIMING.slash.impactAt))
    expect(landed.at(-1)).toEqual(['ACTION_PERFORMED', 'DAMAGED'])
  })

  it('uses the timing it is given, e.g. a custom effect of the GM', async () => {
    const ref = customEffectRef('black-flame')
    const custom = new Map([
      [
        'black-flame',
        {
          id: 'black-flame',
          name: 'Fiamma nera',
          videoAssetId: 'vid',
          durationMs: 2000,
          impactAt: 0.75,
          scale: 1,
          soundAssetId: null,
          updatedAt: 0,
        },
      ],
    ])
    const { sequencer, applied } = setup({ timing: (effect) => timingOf(effect, custom) })
    const events = actionEvents(null, null)
    events[0] = { ...events[0]!, effect: ref } as BattleEvent
    sequencer.enqueue(named('custom'), events)
    await advance(1499)
    expect(applied).toEqual([])
    await advance(1)
    expect(applied.map((a) => a.name)).toEqual(['custom'])
    // A custom effect that no longer exists plays like no effect.
    expect(timingOf(customEffectRef('gone'), custom)).toEqual(NO_EFFECT_TIMING)
  })
})
