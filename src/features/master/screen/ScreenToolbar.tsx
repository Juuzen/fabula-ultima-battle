import { Eye, EyeOff, Settings2 } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { useBattleActions, useBattleStore } from '@/app/store'
import { MAX_AUTO_HIDE_SECONDS, MIN_AUTO_HIDE_SECONDS, type EnemyPanel } from '@/domain'
import { parseWholeNumber } from '@/shared/lib/numbers'
import { Button } from '@/shared/ui/Button'
import { NumberField, Toggle } from '@/shared/ui/fields'
import { Popover } from '@/shared/ui/Popover'

/** Seconds field that commits on blur / Enter, so typing doesn't spam the player screen. */
function AutoHideField({ seconds }: { seconds: number }) {
  const { t } = useTranslation()
  const { dispatch } = useBattleActions()
  const [draft, setDraft] = useState(String(seconds))
  const [lastSeconds, setLastSeconds] = useState(seconds)

  // Follow external changes (scene load) without an effect.
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
      className="w-40"
    />
  )
}

/** Secondary settings of the player screen, out of the way until needed. */
function ScreenSettings() {
  const { t } = useTranslation()
  const { dispatch } = useBattleActions()
  const presentation = useBattleStore((s) => s.battle.presentation)
  const { mode, autoHideSeconds } = presentation.enemyPanel
  const setPanel = (changes: Partial<EnemyPanel>) =>
    dispatch({ type: 'SET_PRESENTATION', changes: { enemyPanel: changes } })

  return (
    <Popover
      label={t('master.settings.title')}
      panelClassName="w-[min(22rem,calc(100vw-2rem))]"
      triggerClassName="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-slate-800 text-slate-100 ring-1 ring-slate-600 transition-colors hover:bg-slate-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-400 aria-expanded:bg-slate-700"
      trigger={<Settings2 className="h-4 w-4" aria-hidden="true" />}
    >
      <div className="flex flex-col gap-4">
        <h2 className="font-display text-lg tracking-wide text-slate-100">
          {t('master.enemyPanel.title')}
        </h2>
        <div className="flex flex-col gap-2">
          <div
            role="radiogroup"
            aria-label={t('master.enemyPanel.mode')}
            className="inline-flex self-start rounded-md bg-slate-950 p-1 ring-1 ring-slate-700"
          >
            {(['manual', 'auto'] as const).map((m) => (
              <button
                key={m}
                type="button"
                role="radio"
                aria-checked={mode === m}
                onClick={() => mode !== m && setPanel({ mode: m })}
                className={`rounded px-3 py-1.5 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-indigo-400 ${
                  mode === m ? 'bg-indigo-600 text-white' : 'text-slate-300 hover:text-white'
                }`}
              >
                {t(`master.enemyPanel.${m}`)}
              </button>
            ))}
          </div>
          <p className="text-xs text-slate-400">
            {t(mode === 'auto' ? 'master.enemyPanel.autoHint' : 'master.enemyPanel.manualHint')}
          </p>
        </div>
        {mode === 'auto' && <AutoHideField seconds={autoHideSeconds} />}
        <Toggle
          label={t('master.enemyPanel.revealAll')}
          checked={presentation.revealAllEnemyStats}
          onChange={(revealAllEnemyStats) =>
            dispatch({ type: 'SET_PRESENTATION', changes: { revealAllEnemyStats } })
          }
        />
      </div>
    </Popover>
  )
}

/** Shows or hides the enemy window on the player screen: a live command, always at hand. */
function EnemyWindowToggle() {
  const { t } = useTranslation()
  const { dispatch } = useBattleActions()
  const visible = useBattleStore((s) => s.battle.presentation.enemyPanel.visible)
  const Icon = visible ? EyeOff : Eye
  return (
    <Button
      variant={visible ? 'primary' : 'secondary'}
      aria-pressed={visible}
      title={t('master.enemyPanel.toggleHint')}
      onClick={() =>
        dispatch({ type: 'SET_PRESENTATION', changes: { enemyPanel: { visible: !visible } } })
      }
    >
      <Icon className="h-4 w-4" aria-hidden="true" />
      {t(visible ? 'master.enemyPanel.hide' : 'master.enemyPanel.show')}
    </Button>
  )
}

/** The cockpit's own bar: the scene's name, the enemy window and the screen settings. */
export function ScreenToolbar() {
  const { t } = useTranslation()
  const name = useBattleStore((s) => s.battle.name)
  return (
    <div className="flex flex-wrap items-center gap-3">
      <h1 className="font-display min-w-0 flex-1 truncate text-2xl font-bold tracking-wide text-white">
        {name || t('master.screen.untitled')}
      </h1>
      <EnemyWindowToggle />
      <ScreenSettings />
    </div>
  )
}
