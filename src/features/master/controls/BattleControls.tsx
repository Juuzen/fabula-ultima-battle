import { Flag } from 'lucide-react'
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
  const enemies = useCombatants('enemy')
  const [armed, setArmed] = useState(false)

  if (!armed) {
    return (
      <Button variant="danger" disabled={enemies.length === 0} onClick={() => setArmed(true)}>
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

export function BattleControls() {
  const { t } = useTranslation()
  return (
    <Panel title={t('master.battle.title')}>
      <div className="flex flex-col gap-4">
        <BattleNameField />
        <div className="flex flex-col gap-1.5">
          <EndBattleButton />
          <p className="text-xs text-slate-400">{t('master.battle.endHint')}</p>
        </div>
      </div>
    </Panel>
  )
}
