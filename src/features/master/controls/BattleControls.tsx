import { Flag, Swords } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { useBattleActions, useBattleStore, useCombatants } from '@/app/store'
import { Button } from '@/shared/ui/Button'
import { TextField } from '@/shared/ui/fields'
import { Panel } from '@/shared/ui/Panel'

/** Name field that commits on blur / Enter (one undo step per rename, not per keystroke). */
function BattleNameField() {
  const { t } = useTranslation()
  const { dispatch } = useBattleActions()
  const name = useBattleStore((s) => s.battle.name)
  const [draft, setDraft] = useState(name)
  const [lastName, setLastName] = useState(name)

  if (name !== lastName) {
    setLastName(name)
    setDraft(name)
  }

  const commit = () => {
    if (draft.trim() !== name) dispatch({ type: 'RENAME_BATTLE', name: draft.trim() })
  }

  return (
    <TextField
      label={t('master.battleName')}
      placeholder={t('master.battleNamePlaceholder')}
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => e.key === 'Enter' && commit()}
    />
  )
}

/** Two-step "End battle": the first click arms it, the second confirms. */
function EndBattleButton() {
  const { t } = useTranslation()
  const { dispatch } = useBattleActions()
  const [armed, setArmed] = useState(false)

  if (!armed) {
    return (
      <Button variant="danger" onClick={() => setArmed(true)}>
        <Flag className="h-4 w-4" aria-hidden="true" />
        {t('master.battle.end')}
      </Button>
    )
  }

  return (
    <div className="flex flex-wrap gap-2">
      <Button
        variant="danger"
        autoFocus
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

function PhaseBadge({ active }: { active: boolean }) {
  const { t } = useTranslation()
  return (
    <span
      data-testid="battle-phase"
      className={`rounded-full px-2.5 py-0.5 text-xs font-semibold tracking-wide uppercase ${
        active ? 'bg-rose-600 text-white' : 'bg-amber-400/90 text-amber-950'
      }`}
    >
      {t(active ? 'master.battle.phaseActive' : 'master.battle.phasePreparation')}
    </span>
  )
}

/**
 * Preparation → "Start battle" reveals the enemies to the players.
 * Active → "End battle" removes them and goes back to preparation.
 */
export function BattleControls() {
  const { t } = useTranslation()
  const { dispatch } = useBattleActions()
  const active = useBattleStore((s) => s.battle.phase === 'active')
  const enemies = useCombatants('enemy')

  return (
    <Panel title={t('master.battle.title')} actions={<PhaseBadge active={active} />}>
      <div className="flex flex-col gap-4">
        <BattleNameField />
        {active ? (
          <div className="flex flex-col gap-1.5">
            <EndBattleButton />
            <p className="text-xs text-slate-400">{t('master.battle.endHint')}</p>
          </div>
        ) : (
          <div className="flex flex-col gap-1.5">
            <Button
              variant="primary"
              disabled={enemies.length === 0}
              onClick={() => dispatch({ type: 'START_BATTLE' })}
            >
              <Swords className="h-4 w-4" aria-hidden="true" />
              {t('master.battle.start')}
            </Button>
            <p className="text-xs text-slate-400">
              {t('master.battle.prepHint')} {t('master.battle.startHint')}
            </p>
          </div>
        )}
      </div>
    </Panel>
  )
}
