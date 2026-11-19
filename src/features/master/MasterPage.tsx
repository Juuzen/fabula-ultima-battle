import { MonitorCheck, MonitorOff, MonitorUp, Undo2 } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { useBattleActions, useCanUndo } from '@/app/store'
import { Button } from '@/shared/ui/Button'
import { LanguageSwitcher } from '@/shared/ui/LanguageSwitcher'

import { ActionPanel } from './action/ActionPanel'
import { BattleControls } from './controls/BattleControls'
import { EnemyPanelControls } from './controls/EnemyPanelControls'
import { ErrorBanner } from './controls/ErrorBanner'
import { openDisplayWindow } from './openDisplayWindow'
import { DisplayPreview } from './preview/DisplayPreview'
import { RosterSection } from './roster/RosterSection'
import { useMasterSync } from './useMasterSync'
import { useUndoShortcut } from './useUndoShortcut'

/** Game Master dashboard: owns the authoritative battle state. */
export function MasterPage() {
  const { t } = useTranslation()
  const { undo } = useBattleActions()
  const canUndo = useCanUndo()
  const [popupBlocked, setPopupBlocked] = useState(false)
  const displays = useMasterSync()
  useUndoShortcut()

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="sticky top-0 z-10 flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 bg-slate-950/95 px-6 py-3 backdrop-blur">
        <h1 className="font-display text-2xl tracking-wide">{t('master.title')}</h1>
        <div className="flex flex-wrap items-center gap-2">
          <span
            role="status"
            data-testid="display-connection"
            className={`mr-2 inline-flex items-center gap-1.5 text-sm ${
              displays > 0 ? 'text-emerald-400' : 'text-slate-500'
            }`}
          >
            {displays > 0 ? (
              <MonitorCheck className="h-4 w-4" aria-hidden="true" />
            ) : (
              <MonitorOff className="h-4 w-4" aria-hidden="true" />
            )}
            {t(displays > 0 ? 'master.connected' : 'master.notConnected')}
          </span>
          <Button
            onClick={undo}
            disabled={!canUndo}
            title={`${t('master.undo')} (${t('master.undoShortcut')})`}
          >
            <Undo2 className="h-4 w-4" aria-hidden="true" />
            {t('master.undo')}
          </Button>
          <Button
            variant="primary"
            title={t('master.openDisplayHint')}
            onClick={() => setPopupBlocked(openDisplayWindow() === null)}
          >
            <MonitorUp className="h-4 w-4" aria-hidden="true" />
            {t('master.openDisplay')}
          </Button>
          <LanguageSwitcher />
        </div>
      </header>

      <main className="flex flex-col gap-4 p-6">
        {popupBlocked && (
          <p role="alert" className="text-sm text-rose-400">
            {t('master.popupBlocked')}
          </p>
        )}
        <ErrorBanner />

        <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(420px,36%)]">
          <div className="flex min-w-0 flex-col gap-6">
            <RosterSection side="ally" />
            <RosterSection side="enemy" />
          </div>
          {/* Sticky on wide screens, with its own scroll: it is taller than the viewport. */}
          <aside className="flex flex-col gap-6 xl:sticky xl:top-20 xl:max-h-[calc(100vh-6rem)] xl:overflow-y-auto xl:pr-1">
            <DisplayPreview />
            <ActionPanel />
            <EnemyPanelControls />
            <BattleControls />
          </aside>
        </div>
      </main>
    </div>
  )
}
