import { combatantsOnSide, type BattleState, type Combatant, type Side } from '@/domain'

import { EnemyInfoWindow } from '../hud/EnemyInfoWindow'
import { PartyPanel } from '../hud/PartyPanel'
import { useEnemyPanelVisibility } from '../hud/useEnemyPanelVisibility'
import { Backdrop } from './Backdrop'
import { CombatantSprite } from './CombatantSprite'
import { formationSlots } from './formation'
import { NameplateLayer } from './NameplateLayer'

function SideFormation({ combatants, side }: { combatants: Combatant[]; side: Side }) {
  const slots = formationSlots(combatants.length, side)
  return combatants.map((c, i) => <CombatantSprite key={c.id} combatant={c} slot={slots[i]!} />)
}

/** The whole player-facing scene, in 1920×1080 stage coordinates. Purely presentational. */
export function BattleScene({ battle }: { battle: BattleState }) {
  const allies = combatantsOnSide(battle, 'ally')
  const enemies = combatantsOnSide(battle, 'enemy')
  const enemyPanelVisible = useEnemyPanelVisibility(battle)

  return (
    <div className="absolute inset-0">
      <Backdrop assetId={battle.backgroundAssetId} />

      <div className="absolute inset-0">
        <SideFormation combatants={enemies} side="enemy" />
        <SideFormation combatants={allies} side="ally" />
      </div>

      <NameplateLayer enemies={enemies} slots={formationSlots(enemies.length, 'enemy')} />

      {enemies.length > 0 && (
        <EnemyInfoWindow
          enemies={enemies}
          presentation={battle.presentation}
          visible={enemyPanelVisible}
        />
      )}

      {allies.length > 0 && (
        <div className="absolute inset-x-0 bottom-5 h-[262px]" style={{ zIndex: 1400 }}>
          <PartyPanel allies={allies} />
        </div>
      )}
    </div>
  )
}
