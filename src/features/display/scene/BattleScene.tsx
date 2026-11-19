import { AnimatePresence } from 'motion/react'
import { useMemo } from 'react'

import { combatantsOnSide, type BattleState, type Combatant, type Side } from '@/domain'

import { useChoreoStore } from '../choreography/choreoStore'
import { ActionBanner } from '../effects/ActionBanner'
import { EffectLayer } from '../effects/EffectLayer'
import { FloatingTextLayer, type Anchor } from '../fx/FloatingTextLayer'
import { EnemyInfoWindow } from '../hud/EnemyInfoWindow'
import { PartyPanel } from '../hud/PartyPanel'
import { useEnemyPanelVisibility } from '../hud/useEnemyPanelVisibility'
import { Backdrop } from './Backdrop'
import { CombatantSprite } from './CombatantSprite'
import { entranceDelay } from './entrance'
import { formationSlots, type Slot } from './formation'
import { NameplateLayer } from './NameplateLayer'
import { SPRITE_BOX } from './spriteBox'

function SideFormation({ combatants, slots }: { combatants: Combatant[]; slots: Slot[] }) {
  return (
    <AnimatePresence>
      {combatants.map((c, i) => (
        <CombatantSprite
          key={c.id}
          combatant={c}
          slot={slots[i]!}
          entranceDelay={entranceDelay(i)}
        />
      ))}
    </AnimatePresence>
  )
}

/** Where floating combat text appears: a bit above the middle of each sprite. */
function anchorsOf(groups: [Combatant[], Slot[]][], heightRatio = 0.55): Map<string, Anchor> {
  const anchors = new Map<string, Anchor>()
  for (const [combatants, slots] of groups) {
    combatants.forEach((c, i) => {
      const slot = slots[i]
      if (slot) {
        anchors.set(c.id, { x: slot.x, y: slot.y - SPRITE_BOX.height * slot.scale * heightRatio })
      }
    })
  }
  return anchors
}

function sideLayout(battle: BattleState, side: Side) {
  const combatants = combatantsOnSide(battle, side)
  return { combatants, slots: formationSlots(combatants.length, side) }
}

/** The whole player-facing scene, in 1920×1080 stage coordinates. Purely presentational. */
export function BattleScene({ battle }: { battle: BattleState }) {
  const enemySide = useMemo(() => sideLayout(battle, 'enemy'), [battle])
  const allySide = useMemo(() => sideLayout(battle, 'ally'), [battle])
  const anchors = useMemo(
    () =>
      anchorsOf([
        [enemySide.combatants, enemySide.slots],
        [allySide.combatants, allySide.slots],
      ]),
    [enemySide, allySide],
  )
  // Effects are centred on the body, a bit lower than the floating texts.
  const centres = useMemo(
    () =>
      anchorsOf(
        [
          [enemySide.combatants, enemySide.slots],
          [allySide.combatants, allySide.slots],
        ],
        0.45,
      ),
    [enemySide, allySide],
  )
  const enemyPanelWanted = useEnemyPanelVisibility(battle)
  // During an action the top of the screen belongs to its name banner: the enemy band steps
  // aside and comes back afterwards (in auto mode the action's outcome pops it up anyway).
  const actionPlaying = useChoreoStore((s) => s.stage !== null)
  const enemyPanelVisible = enemyPanelWanted && !actionPlaying
  const enemies = enemySide.combatants
  const allies = allySide.combatants

  return (
    <div className="absolute inset-0">
      <Backdrop assetId={battle.backgroundAssetId} />

      <div className="absolute inset-0">
        <SideFormation combatants={enemies} slots={enemySide.slots} />
        <SideFormation combatants={allies} slots={allySide.slots} />
      </div>

      <NameplateLayer enemies={enemies} slots={enemySide.slots} />
      <EffectLayer centres={centres} />
      <FloatingTextLayer anchors={anchors} />
      <ActionBanner />

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
