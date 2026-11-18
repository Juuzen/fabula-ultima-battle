import { useEffect, useMemo, useState } from 'react'

import { areStatsRevealed, combatantsOnSide, type BattleState } from '@/domain'

/** Everything about the enemies that the players can perceive; a change pops the panel (auto mode). */
export function enemySignature(battle: BattleState): string {
  const { presentation } = battle
  return JSON.stringify(
    combatantsOnSide(battle, 'enemy').map((e) => [
      e.id,
      e.name,
      e.hp,
      e.maxHp,
      e.mp,
      e.maxMp,
      e.statuses,
      areStatsRevealed(presentation, e),
    ]),
  )
}

/**
 * Whether the enemy info window is on screen.
 * - manual: follows the GM's `visible` flag.
 * - auto: also pops up whenever enemy info changes, then hides after `autoHideSeconds`
 *   (each new change restarts the countdown). The GM can still force it with `visible`.
 */
export function useEnemyPanelVisibility(battle: BattleState): boolean {
  const { mode, visible, autoHideSeconds } = battle.presentation.enemyPanel
  const signature = useMemo(() => enemySignature(battle), [battle])

  // Count changes during render (React's "derive from previous props" pattern);
  // the first render is the baseline, not a change.
  const [seenSignature, setSeenSignature] = useState(signature)
  const [changeCount, setChangeCount] = useState(0)
  const [hiddenAtCount, setHiddenAtCount] = useState(0)
  if (signature !== seenSignature) {
    setSeenSignature(signature)
    if (mode === 'auto') setChangeCount((n) => n + 1)
  }

  const autoShown = changeCount !== hiddenAtCount

  // Each new change re-runs the effect, which restarts the countdown.
  useEffect(() => {
    if (!autoShown) return
    const timer = setTimeout(() => setHiddenAtCount(changeCount), autoHideSeconds * 1000)
    return () => clearTimeout(timer)
  }, [autoShown, changeCount, autoHideSeconds])

  return visible || (mode === 'auto' && autoShown)
}
