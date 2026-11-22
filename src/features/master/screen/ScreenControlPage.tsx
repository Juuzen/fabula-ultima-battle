import { CircleCheck, X } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useLocation } from 'react-router'

import { DetailPane } from '../detail/DetailPane'
import { FieldPane } from '../field/FieldPane'
import { ScreenToolbar } from './ScreenToolbar'

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

/**
 * Live cockpit, master/detail: the field on the left (who is there, how they stand), the
 * detail on the right (what the selected combatant can do, or the GM's own action).
 * In two-column mode the page fits the viewport and each pane scrolls on its own.
 */
export function ScreenControlPage() {
  return (
    <div className="flex flex-col gap-4 @5xl:h-[calc(100dvh-7rem)]">
      <SceneLoadedNotice />
      <ScreenToolbar />
      <div className="grid min-h-0 flex-1 items-stretch gap-4 @5xl:grid-cols-[minmax(20rem,26rem)_minmax(0,1fr)]">
        <FieldPane />
        <DetailPane />
      </div>
    </div>
  )
}
