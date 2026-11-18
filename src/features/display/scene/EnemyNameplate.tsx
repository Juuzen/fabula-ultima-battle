import type { Combatant } from '@/domain'

import { StateTag } from '../hud/StateTag'
import { StatusIcons } from '../hud/StatusIcons'

/**
 * Always-visible label above an enemy: name, Crisis/KO and statuses.
 * Stays on screen (KO included) until the GM ends the battle.
 */
export function EnemyNameplate({ enemy }: { enemy: Combatant }) {
  return (
    <div
      data-testid={`nameplate-${enemy.id}`}
      className="pointer-events-none flex flex-col items-center gap-1"
    >
      <div className="flex items-center gap-2 rounded-md bg-slate-950/70 px-2.5 py-0.5 ring-1 ring-white/20">
        <span className="font-display max-w-[230px] truncate text-base font-bold text-white [text-shadow:0_2px_0_rgba(0,0,0,.7)]">
          {enemy.name}
        </span>
        <StateTag combatant={enemy} size="sm" />
      </div>
      <StatusIcons statuses={enemy.statuses} size={24} />
    </div>
  )
}
