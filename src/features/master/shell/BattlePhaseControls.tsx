import { Flag, Swords } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { useBattleActions, useBattleStore, useCombatants } from '@/app/store'
import { Button } from '@/shared/ui/Button'

/** Two-step "End battle": the first click arms it, the second confirms. */
function EndBattleButton() {
  const { t } = useTranslation()
  const { dispatch } = useBattleActions()
  const [armed, setArmed] = useState(false)

  if (!armed) {
    return (
      <Button variant="danger" title={t('master.battle.endHint')} onClick={() => setArmed(true)}>
        <Flag className="h-4 w-4" aria-hidden="true" />
        {t('master.battle.end')}
      </Button>
    )
  }

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="danger"
        autoFocus
        title={t('master.battle.endHint')}
        onClick={() => {
          dispatch({ type: 'END_BATTLE' })
          setArmed(false)
        }}
      >
        {t('master.battle.endConfirm')}
      </Button>
      <Button variant="ghost" onClick={() => setArmed(false)}>
        {t('master.battle.endCancel')}
      </Button>
    </div>
  )
}

/**
 * The one phase transition available now.
 * Preparation → "Start battle" reveals the enemies; Active → "End battle" removes them.
 */
export function BattlePhaseControls() {
  const { t } = useTranslation()
  const { dispatch } = useBattleActions()
  const active = useBattleStore((s) => s.battle.phase === 'active')
  const enemies = useCombatants('enemy')

  return (
    <div
      data-testid="battle-phase"
      data-phase={active ? 'active' : 'preparation'}
      className="flex items-center"
    >
      {active ? (
        <EndBattleButton />
      ) : (
        <Button
          variant="primary"
          disabled={enemies.length === 0}
          title={`${t('master.battle.prepHint')} ${t('master.battle.startHint')}`}
          onClick={() => dispatch({ type: 'START_BATTLE' })}
        >
          <Swords className="h-4 w-4" aria-hidden="true" />
          {t('master.battle.start')}
        </Button>
      )}
    </div>
  )
}
