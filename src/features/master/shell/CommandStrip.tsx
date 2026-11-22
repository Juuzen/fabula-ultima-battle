import { MonitorCheck, MonitorOff, MonitorUp, PictureInPicture2 } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/shared/ui/Button'

import { ErrorBanner } from '../controls/ErrorBanner'
import { openDisplayWindow } from '../openDisplayWindow'
import { usePreviewWindow } from '../preview/previewWindowStore'
import { BattlePhaseControls } from './BattlePhaseControls'
import { ShortcutHelp } from './ShortcutHelp'

/** Shows or hides the floating player-screen preview. */
function PreviewToggle() {
  const { t } = useTranslation()
  const open = usePreviewWindow((s) => s.open)
  const toggle = usePreviewWindow((s) => s.toggle)
  return (
    <Button aria-pressed={open} onClick={toggle} title={t('master.preview.toggleHint')}>
      <PictureInPicture2 className="h-4 w-4" aria-hidden="true" />
      {t('master.preview.toggle')}
    </Button>
  )
}

/**
 * Connection to the player screen, read at a glance: a tinted pill with an icon, a status dot
 * and plain text. Disconnected is the state the GM must notice, so it also offers the fix.
 */
function DisplayConnection({ displays }: { displays: number }) {
  const { t } = useTranslation()
  const connected = displays > 0
  const [wasConnected, setWasConnected] = useState(connected)
  const [popupBlocked, setPopupBlocked] = useState(false)
  if (connected && !wasConnected) setWasConnected(true)

  return (
    <div className="flex flex-wrap items-center gap-3">
      <span
        role="status"
        data-testid="display-connection"
        data-connected={connected}
        className={`inline-flex h-9 items-center gap-2 rounded-full px-3.5 text-sm font-semibold whitespace-nowrap ring-1 ${
          connected
            ? 'bg-emerald-950/70 text-emerald-200 ring-emerald-600/70'
            : 'bg-rose-950/70 text-rose-100 ring-rose-600/80'
        }`}
      >
        {connected ? (
          <MonitorCheck className="h-5 w-5 text-emerald-400" aria-hidden="true" />
        ) : (
          <MonitorOff className="h-5 w-5 text-rose-400" aria-hidden="true" />
        )}
        {t(connected ? 'master.connected' : 'master.notConnected')}
      </span>
      {!connected && (
        <Button
          variant="secondary"
          title={t('master.openDisplayHint')}
          onClick={() => setPopupBlocked(openDisplayWindow() === null)}
        >
          <MonitorUp className="h-4 w-4" aria-hidden="true" />
          {t(wasConnected ? 'master.strip.reopen' : 'master.openDisplay')}
        </Button>
      )}
      {popupBlocked && !connected && (
        <p role="alert" className="text-sm text-rose-300">
          {t('master.popupBlocked')}
        </p>
      )}
    </div>
  )
}

/**
 * Persistent bar above every section: the player-screen link on the left, undo and the
 * battle phase transition on the right. Everything the GM may need mid-fight, whatever page is open.
 */
export function CommandStrip({ displays }: { displays: number }) {
  const { t } = useTranslation()
  return (
    <header
      aria-label={t('master.strip.label')}
      className="sticky top-0 z-20 border-b border-slate-800 bg-slate-950/95 backdrop-blur"
    >
      <div className="flex min-h-16 flex-wrap items-center gap-x-6 gap-y-2 px-6 py-3">
        <DisplayConnection displays={displays} />
        <div className="ml-auto flex min-w-0 items-center gap-3">
          <PreviewToggle />
          <BattlePhaseControls />
          <ShortcutHelp />
        </div>
      </div>
      <div className="px-6 pb-3 empty:hidden">
        <ErrorBanner />
      </div>
    </header>
  )
}
