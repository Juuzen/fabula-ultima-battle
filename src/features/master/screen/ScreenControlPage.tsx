import { CircleCheck, X } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useLocation } from 'react-router'

import { ActionBar } from '../action/ActionBar'
import { EnemyPanelControls } from '../controls/EnemyPanelControls'
import { DisplayPreview } from '../preview/DisplayPreview'
import { RosterSection } from '../roster/RosterSection'
import { DeployPanel } from './DeployPanel'

type LoadedSceneState = { loadedScene?: string; missing?: number } | null

/** Confirms a scene loaded from the Battle scenes page, and mentions skipped sheets. */
function SceneLoadedNotice() {
  const { t } = useTranslation()
  const state = useLocation().state as LoadedSceneState
  const [dismissed, setDismissed] = useState(false)
  if (!state?.loadedScene || dismissed) return null

  return (
    <div
      role="status"
      className="flex items-start justify-between gap-3 rounded-lg border border-emerald-800 bg-emerald-950/60 px-4 py-3 text-sm text-emerald-100"
    >
      <p className="flex items-start gap-2">
        <CircleCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" aria-hidden="true" />
        <span>
          {t('deploy.sceneLoaded', { name: state.loadedScene })}
          {state.missing ? ` ${t('scenes.missingUnits', { count: state.missing })}` : ''}
        </span>
      </p>
      <button
        type="button"
        onClick={() => setDismissed(true)}
        aria-label={t('deploy.dismiss')}
        className="rounded p-1 hover:bg-emerald-900 focus-visible:outline-2 focus-visible:outline-emerald-400"
      >
        <X className="h-4 w-4" aria-hidden="true" />
      </button>
    </div>
  )
}

/** Live cockpit: both sides, the player-screen preview and the controls for the running fight. */
export function ScreenControlPage() {
  return (
    <div className="flex flex-col gap-6">
      <SceneLoadedNotice />
      <div className="grid items-start gap-6 @5xl:grid-cols-[minmax(0,1fr)_minmax(420px,36%)]">
        <div className="flex min-w-0 flex-col gap-6">
          <DeployPanel />
          <RosterSection side="ally" />
          <RosterSection side="enemy" />
          <ActionBar />
        </div>
        {/* Sticky in two-column mode, with its own scroll: it is taller than the viewport. */}
        <aside className="flex flex-col gap-6 @5xl:sticky @5xl:top-22 @5xl:max-h-[calc(100vh-7rem)] @5xl:overflow-y-auto @5xl:pr-1">
          <DisplayPreview />
          <EnemyPanelControls />
        </aside>
      </div>
    </div>
  )
}
