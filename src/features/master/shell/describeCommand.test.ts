import { describe, expect, it } from 'vitest'

import { createCombatant, createEmptyBattle, type BattleCommand } from '@/domain'
import i18n from '@/shared/i18n'

import { describeCommand } from './describeCommand'

const battle = {
  ...createEmptyBattle(),
  combatants: [
    createCombatant({ id: 'b', name: 'Bastian', side: 'ally', maxHp: 60, maxMp: 20 }),
    createCombatant({ id: 'g1', name: 'Goblin 1', side: 'enemy', maxHp: 20 }),
    createCombatant({ id: 'g2', name: 'Goblin 2', side: 'enemy', maxHp: 20 }),
  ],
}
const label = (command: BattleCommand) => describeCommand({ battle, command }, i18n.t)

describe('describeCommand', () => {
  it('names damage, heal and MP with amount and target', () => {
    expect(label({ type: 'DAMAGE', id: 'b', amount: 45 })).toBe('Danno 45 → Bastian')
    expect(label({ type: 'HEAL', id: 'b', amount: 10 })).toBe('Cura 10 → Bastian')
    expect(label({ type: 'SPEND_MP', id: 'b', amount: 5 })).toBe('−5 PM → Bastian')
  })

  it('names a removed combatant from the state before removal', () => {
    expect(label({ type: 'REMOVE_COMBATANT', id: 'g1' })).toBe('Rimosso Goblin 1')
  })

  it('uses the localized status name', () => {
    expect(label({ type: 'SET_STATUS', id: 'b', status: 'slow', active: true })).toBe(
      'Lento → Bastian',
    )
  })

  it('summarizes actions by name, actor and targets', () => {
    const action = {
      actorId: 'b',
      name: 'Palla di fuoco',
      effect: 'fire',
      kind: 'damage',
      mpCost: 10,
      statuses: [],
      targets: [
        { id: 'g1', amount: 12 },
        { id: 'g2', amount: 12 },
      ],
    } as const
    expect(
      label({
        type: 'PERFORM_ACTION',
        action: { ...action, statuses: [], targets: [...action.targets] },
      }),
    ).toBe('Palla di fuoco di Bastian → 2 bersagli')
    expect(
      label({
        type: 'PERFORM_ACTION',
        action: { ...action, name: '', statuses: [], targets: [{ id: 'g1', amount: 3 }] },
      }),
    ).toBe('Danno PV di Bastian → Goblin 1')
  })
})
