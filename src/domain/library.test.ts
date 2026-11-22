import { describe, expect, it } from 'vitest'

import { applyCommand, type BattleCommand } from './commands'
import { createEmptyBattle, type BattleState } from './battle'
import { createCombatant } from './combatant'
import { partyLeavingField, sceneCombatants } from './scene'
import { combatantFromUnit, createUnit, numberedNames, UnitSchema, type Unit } from './unit'

const lyra = createUnit({
  id: 'u-lyra',
  kind: 'party',
  name: 'Lyra',
  maxHp: 40,
  maxMp: 30,
  hp: 12,
  mp: 5,
})
const goblin = createUnit({ id: 'u-gob', kind: 'enemy', name: 'Goblin', maxHp: 20 })
const units = new Map<string, Unit>([
  [lyra.id, lyra],
  [goblin.id, goblin],
])

function counter() {
  let n = 0
  return () => `c${++n}`
}

function run(state: BattleState, command: BattleCommand) {
  const result = applyCommand(state, command)
  if (!result.ok) throw new Error(result.error.message)
  return result
}

describe('unit sheets', () => {
  it('rejects current PV above the maximum and duplicate ability ids', () => {
    expect(UnitSchema.safeParse({ ...lyra, hp: 41 }).success).toBe(false)
    const ability = {
      id: 'a',
      name: 'Fendente',
      effect: 'slash',
      kind: 'damage',
      statuses: [],
      mpCostHint: null,
      amountHint: 15,
    } as const
    expect(UnitSchema.safeParse({ ...lyra, abilities: [ability] }).success).toBe(true)
    expect(UnitSchema.safeParse({ ...lyra, abilities: [ability, ability] }).success).toBe(false)
  })

  it('party members bring their current PV/PM, enemies enter at full strength', () => {
    expect(combatantFromUnit(lyra, 'x')).toMatchObject({
      side: 'ally',
      unitId: 'u-lyra',
      hp: 12,
      mp: 5,
    })
    const hurtGoblin = { ...goblin, hp: 3 }
    expect(combatantFromUnit(hurtGoblin, 'y', 'Goblin 2')).toMatchObject({
      side: 'enemy',
      name: 'Goblin 2',
      hp: 20,
    })
  })

  it('numbers enemy copies, continuing what is already on the field', () => {
    expect(numberedNames('Goblin', 1, [])).toEqual(['Goblin'])
    expect(numberedNames('Goblin', 3, [])).toEqual(['Goblin 1', 'Goblin 2', 'Goblin 3'])
    expect(numberedNames('Goblin', 1, ['Goblin'])).toEqual(['Goblin 2'])
    expect(numberedNames('Goblin', 2, ['Goblin 1', 'Goblin 3', 'Goblin Re'])).toEqual([
      'Goblin 4',
      'Goblin 5',
    ])
  })
})

describe('battle scenes', () => {
  it('expands party then enemies, sharing numbering across rows of the same sheet', () => {
    const { combatants, missing } = sceneCombatants(
      {
        partyUnitIds: ['u-lyra', 'u-gone'],
        enemies: [
          { unitId: 'u-gob', count: 2 },
          { unitId: 'u-gob', count: 1 },
        ],
      },
      units,
      counter(),
    )
    expect(combatants.map((c) => c.name)).toEqual(['Lyra', 'Goblin 1', 'Goblin 2', 'Goblin 3'])
    expect(missing).toEqual(['u-gone'])
  })

  it('reports the party members that left the field with their PV/PM', () => {
    const before = {
      ...createEmptyBattle(),
      combatants: [
        createCombatant({ ...combatantFromUnit(lyra, 'c1'), hp: 7 }),
        createCombatant({ id: 'npc', name: 'Guida', side: 'ally', maxHp: 10 }),
        createCombatant(combatantFromUnit(goblin, 'c2')),
      ],
    }
    const after = run(before, { type: 'END_BATTLE' }).state
    expect(partyLeavingField(before, after)).toEqual([{ unitId: 'u-lyra', hp: 7, mp: 5 }])
    expect(partyLeavingField(before, before)).toEqual([])
  })
})

describe('DEPLOY and LOAD_SCENE', () => {
  it('deploys several combatants as one step', () => {
    const { state, events } = run(createEmptyBattle(), {
      type: 'DEPLOY',
      combatants: ['Goblin 1', 'Goblin 2'].map((name, i) =>
        combatantFromUnit(goblin, `g${i}`, name),
      ),
    })
    expect(state.combatants.map((c) => c.name)).toEqual(['Goblin 1', 'Goblin 2'])
    expect(events.map((e) => e.type)).toEqual(['COMBATANT_ADDED', 'COMBATANT_ADDED'])
  })

  it('refuses a party sheet that is already on the field', () => {
    const state = run(createEmptyBattle(), {
      type: 'DEPLOY',
      combatants: [combatantFromUnit(lyra, 'c1')],
    }).state
    const again = applyCommand(state, {
      type: 'DEPLOY',
      combatants: [combatantFromUnit(lyra, 'c2')],
    })
    expect(again).toMatchObject({ ok: false, error: { code: 'UNIT_ALREADY_DEPLOYED' } })
    const twiceInOne = applyCommand(createEmptyBattle(), {
      type: 'DEPLOY',
      combatants: [combatantFromUnit(lyra, 'c1'), combatantFromUnit(lyra, 'c2')],
    })
    expect(twiceInOne).toMatchObject({ ok: false, error: { code: 'UNIT_ALREADY_DEPLOYED' } })
  })

  it('loads a scene in place of the field, back in preparation with enemies hidden', () => {
    const active: BattleState = {
      ...createEmptyBattle('Vecchia'),
      phase: 'active',
      combatants: [createCombatant({ id: 'old', name: 'Orco', side: 'enemy', maxHp: 50 })],
      presentation: {
        ...createEmptyBattle().presentation,
        revealAllEnemyStats: true,
      },
    }
    const { combatants } = sceneCombatants(
      { partyUnitIds: ['u-lyra'], enemies: [{ unitId: 'u-gob', count: 2 }] },
      units,
      counter(),
    )
    const { state, events } = run(active, {
      type: 'LOAD_SCENE',
      name: ' Agguato al porto ',
      backgroundAssetId: 'bg-porto',
      combatants,
    })
    expect(state).toMatchObject({
      name: 'Agguato al porto',
      phase: 'preparation',
      backgroundAssetId: 'bg-porto',
    })
    expect(state.combatants.map((c) => c.name)).toEqual(['Lyra', 'Goblin 1', 'Goblin 2'])
    expect(state.presentation.revealAllEnemyStats).toBe(false)
    expect(events).toEqual([{ type: 'BATTLE_LOADED', state }])
  })
})
