import { combatantsOnSide, type BattleState, type Combatant, type Side } from '@/domain'

import { EnemyWindow } from '../hud/EnemyWindow'
import { PartyWindow } from '../hud/PartyWindow'
import { Backdrop } from './Backdrop'
import { CombatantSprite } from './CombatantSprite'
import { formationSlots } from './formation'

function SideFormation({ combatants, side }: { combatants: Combatant[]; side: Side }) {
  const slots = formationSlots(combatants.length, side)
  return combatants.map((c, i) => <CombatantSprite key={c.id} combatant={c} slot={slots[i]!} />)
}

/** The whole player-facing scene, in 1920×1080 stage coordinates. Purely presentational. */
export function BattleScene({ battle }: { battle: BattleState }) {
  const allies = combatantsOnSide(battle, 'ally')
  const enemies = combatantsOnSide(battle, 'enemy')

  return (
    <div className="absolute inset-0">
      <Backdrop assetId={battle.backgroundAssetId} />

      <div className="absolute inset-0">
        <SideFormation combatants={enemies} side="enemy" />
        <SideFormation combatants={allies} side="ally" />
      </div>

      <div className="absolute inset-x-6 bottom-6 flex h-[250px] gap-6">
        <div className="w-[720px] shrink-0">
          {enemies.length > 0 && <EnemyWindow enemies={enemies} />}
        </div>
        <div className="min-w-0 flex-1">{allies.length > 0 && <PartyWindow allies={allies} />}</div>
      </div>
    </div>
  )
}
