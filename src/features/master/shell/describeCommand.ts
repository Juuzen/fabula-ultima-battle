import type { TFunction } from 'i18next'

import type { HistoryEntry } from '@/app/store'
import { findCombatant, type BattleCommand, type BattleState } from '@/domain'

/** Names come from the state *before* the command, so a removed combatant is still named. */
function nameOf(state: BattleState, id: string, t: TFunction): string {
  return findCombatant(state, id)?.name ?? t('master.undoLabels.someone')
}

function describe(command: BattleCommand, before: BattleState, t: TFunction): string {
  const name = (id: string) => nameOf(before, id, t)
  switch (command.type) {
    case 'ADD_COMBATANT':
      return t('master.undoLabels.add', { name: command.combatant.name })
    case 'DEPLOY': {
      const [only] = command.combatants
      return command.combatants.length === 1 && only
        ? t('master.undoLabels.deployOne', { name: only.name })
        : t('master.undoLabels.deploy', { count: command.combatants.length })
    }
    case 'LOAD_SCENE':
      return t('master.undoLabels.scene', { name: command.name })
    case 'UPDATE_COMBATANT':
      return t('master.undoLabels.update', { name: name(command.id) })
    case 'REMOVE_COMBATANT':
      return t('master.undoLabels.remove', { name: name(command.id) })
    case 'MOVE_COMBATANT':
      return t('master.undoLabels.move', { name: name(command.id) })
    case 'DAMAGE':
      return t('master.undoLabels.damage', { amount: command.amount, name: name(command.id) })
    case 'HEAL':
      return t('master.undoLabels.heal', { amount: command.amount, name: name(command.id) })
    case 'SET_HP':
      return t('master.undoLabels.setHp', { value: command.hp, name: name(command.id) })
    case 'SPEND_MP':
      return t('master.undoLabels.spendMp', { amount: command.amount, name: name(command.id) })
    case 'RESTORE_MP':
      return t('master.undoLabels.restoreMp', { amount: command.amount, name: name(command.id) })
    case 'SET_MP':
      return t('master.undoLabels.setMp', { value: command.mp, name: name(command.id) })
    case 'SET_STATUS':
      return t(command.active ? 'master.undoLabels.statusOn' : 'master.undoLabels.statusOff', {
        status: t(`status.${command.status}`),
        name: name(command.id),
      })
    case 'SET_REVEAL_STATS':
      return t(command.reveal ? 'master.undoLabels.revealOn' : 'master.undoLabels.revealOff', {
        name: name(command.id),
      })
    case 'SET_PRESENTATION':
      return t('master.undoLabels.presentation')
    case 'SET_BACKGROUND':
      return t('master.undoLabels.background')
    case 'RENAME_BATTLE':
      return t('master.undoLabels.rename')
    case 'LOAD_BATTLE':
      return t('master.undoLabels.load')
    case 'START_BATTLE':
      return t('master.undoLabels.start')
    case 'END_BATTLE':
      return t('master.undoLabels.end')
    case 'PERFORM_ACTION': {
      const { action } = command
      const label = action.name || t(`master.action.kinds.${action.kind}`)
      const [only] = action.targets
      const target =
        action.targets.length === 1 && only
          ? name(only.id)
          : t('master.undoLabels.targets', { count: action.targets.length })
      return `${t('master.undoLabels.action', { action: label, actor: name(action.actorId) })} → ${target}`
    }
  }
}

/** Short human label for an undo step, e.g. "Danno 45 → Bastian". */
export function describeCommand(entry: HistoryEntry, t: TFunction): string {
  return describe(entry.command, entry.battle, t)
}
