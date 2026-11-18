import { Eye, EyeOff } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { useBattleActions, useBattleStore } from '@/app/store'
import { MAX_AUTO_HIDE_SECONDS, MIN_AUTO_HIDE_SECONDS, type EnemyPanel } from '@/domain'
import { parseWholeNumber } from '@/shared/lib/numbers'
import { Button } from '@/shared/ui/Button'
import { NumberField, Toggle } from '@/shared/ui/fields'
import { Panel } from '@/shared/ui/Panel'

/** Seconds field that commits on blur / Enter, so typing doesn't spam the undo history. */
function AutoHideField({ seconds }: { seconds: number }) {
  const { t } = useTranslation()
  const { dispatch } = useBattleActions()
  const [draft, setDraft] = useState(String(seconds))
  const [lastSeconds, setLastSeconds] = useState(seconds)

  // Follow external changes (undo, load) without an effect.
  if (seconds !== lastSeconds) {
    setLastSeconds(seconds)
    setDraft(String(seconds))
  }

  const commit = () => {
    const value = parseWholeNumber(draft)
    if (value === null || value < MIN_AUTO_HIDE_SECONDS || value > MAX_AUTO_HIDE_SECONDS) {
      setDraft(String(seconds)) // revert invalid input
      return
    }
    if (value !== seconds) {
      dispatch({ type: 'SET_PRESENTATION', changes: { enemyPanel: { autoHideSeconds: value } } })
    }
  }

  return (
    <NumberField
      label={t('master.enemyPanel.autoHide')}
      value={draft}
      onValueChange={setDraft}
      onBlur={commit}
      onKeyDown={(e) => e.key === 'Enter' && commit()}
      min={MIN_AUTO_HIDE_SECONDS}
      max={MAX_AUTO_HIDE_SECONDS}
      className="w-48"
    />
  )
}

export function EnemyPanelControls() {
  const { t } = useTranslation()
  const { dispatch } = useBattleActions()
  const presentation = useBattleStore((s) => s.battle.presentation)
  const { mode, visible, autoHideSeconds } = presentation.enemyPanel

  const setPanel = (changes: Partial<EnemyPanel>) =>
    dispatch({ type: 'SET_PRESENTATION', changes: { enemyPanel: changes } })

  return (
    <Panel title={t('master.enemyPanel.title')}>
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <div
            role="radiogroup"
            aria-label={t('master.enemyPanel.mode')}
            className="inline-flex rounded-md bg-slate-950 p-1 ring-1 ring-slate-700"
          >
            {(['manual', 'auto'] as const).map((m) => (
              <button
                key={m}
                type="button"
                role="radio"
                aria-checked={mode === m}
                onClick={() => mode !== m && setPanel({ mode: m })}
                className={`rounded px-3 py-1.5 text-sm font-medium transition-colors ${
                  mode === m ? 'bg-indigo-600 text-white' : 'text-slate-300 hover:text-white'
                }`}
              >
                {t(`master.enemyPanel.${m}`)}
              </button>
            ))}
          </div>

          <Button
            variant={visible ? 'primary' : 'secondary'}
            aria-pressed={visible}
            onClick={() => setPanel({ visible: !visible })}
          >
            {visible ? (
              <EyeOff className="h-4 w-4" aria-hidden="true" />
            ) : (
              <Eye className="h-4 w-4" aria-hidden="true" />
            )}
            {t(visible ? 'master.enemyPanel.hide' : 'master.enemyPanel.show')}
          </Button>
        </div>

        <p className="text-xs text-slate-400">
          {t(mode === 'auto' ? 'master.enemyPanel.autoHint' : 'master.enemyPanel.manualHint')}
        </p>

        {mode === 'auto' && <AutoHideField seconds={autoHideSeconds} />}

        <Toggle
          label={t('master.enemyPanel.revealAll')}
          checked={presentation.revealAllEnemyStats}
          onChange={(revealAllEnemyStats) =>
            dispatch({ type: 'SET_PRESENTATION', changes: { revealAllEnemyStats } })
          }
        />
      </div>
    </Panel>
  )
}
