import type { BattleState } from '@/domain'

import { BattleScene } from './BattleScene'
import { WaitingScreen } from './WaitingScreen'

/**
 * Everything the players can see, given the (already projected) battle:
 * the waiting screen while preparing, the battle scene once it has started.
 */
export function PlayerScreen({ battle }: { battle: BattleState }) {
  if (battle.phase === 'preparation') {
    return <WaitingScreen backgroundAssetId={battle.presentation.waitingBackgroundAssetId} />
  }
  return <BattleScene battle={battle} />
}
