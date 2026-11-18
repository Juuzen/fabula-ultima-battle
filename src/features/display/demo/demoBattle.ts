import { createCombatant, type BattleState } from '@/domain'

/**
 * Sample encounter shown with `#/display?demo=1`. Exercises every visual state:
 * healthy, Crisis, KO, statuses, flipped sprite, long names.
 */
export const demoBattle: BattleState = {
  name: 'Demo',
  backgroundAssetId: null,
  combatants: [
    createCombatant({ id: 'a1', name: 'Lyra', side: 'ally', maxHp: 62, hp: 48 }),
    createCombatant({
      id: 'a2',
      name: 'Bastian',
      side: 'ally',
      maxHp: 75,
      hp: 30,
      statuses: ['weak'],
    }),
    createCombatant({
      id: 'a3',
      name: 'Mirelle',
      side: 'ally',
      maxHp: 48,
      hp: 0,
      statuses: [],
    }),
    createCombatant({
      id: 'a4',
      name: 'Kaito',
      side: 'ally',
      maxHp: 55,
      hp: 55,
      statuses: ['slow', 'enraged'],
    }),
    createCombatant({ id: 'e1', name: 'Goblin Saccheggiatore', side: 'enemy', maxHp: 40, hp: 33 }),
    createCombatant({
      id: 'e2',
      name: 'Goblin Sciamano',
      side: 'enemy',
      maxHp: 32,
      hp: 12,
      statuses: ['poisoned', 'dazed'],
    }),
    createCombatant({ id: 'e3', name: 'Lupo Mannaro', side: 'enemy', maxHp: 90, hp: 90 }),
    createCombatant({ id: 'e4', name: 'Goblin Arciere', side: 'enemy', maxHp: 28, hp: 0 }),
    createCombatant({
      id: 'e5',
      name: 'Golem di Ferro',
      side: 'enemy',
      maxHp: 120,
      hp: 101,
      flipSprite: true,
    }),
  ],
}
