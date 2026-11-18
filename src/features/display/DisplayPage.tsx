import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useSearchParams } from 'react-router'

import { demoBattle } from './demo/demoBattle'
import { PlayerScreen } from './scene/PlayerScreen'
import { WaitingScreen } from './scene/WaitingScreen'
import { Stage } from './stage/Stage'
import { useDisplayStore } from './state/displayStore'
import { useDisplaySync } from './state/useDisplaySync'

/**
 * Player-facing screen. Read-only: it renders whatever the Master window publishes.
 * `#/display?demo=1` shows a sample encounter, handy to preview layouts and sprites.
 * The first click unlocks audio playback (browser autoplay policy).
 */
export function DisplayPage() {
  const { t } = useTranslation()
  const [started, setStarted] = useState(false)
  const [params] = useSearchParams()
  const isDemo = params.get('demo') === '1'
  const battle = useDisplayStore((s) => s.battle)
  const showBattle = useDisplayStore((s) => s.showBattle)

  useDisplaySync(!isDemo)

  useEffect(() => {
    if (isDemo) showBattle(demoBattle)
  }, [isDemo, showBattle])

  return (
    <Stage>
      {battle ? (
        <PlayerScreen battle={battle} />
      ) : (
        // No dashboard yet: same waiting screen, plus a discreet hint for the GM.
        <WaitingScreen backgroundAssetId={null} note={t('display.masterOffline')} />
      )}

      {!started && (
        <button
          type="button"
          onClick={() => setStarted(true)}
          className="absolute inset-0 z-[2000] flex cursor-pointer flex-col items-center justify-center gap-6 bg-black/70 text-slate-100"
        >
          <span className="font-display text-7xl tracking-widest">{t('display.start')}</span>
          <span className="text-2xl text-slate-300">{t('display.startHint')}</span>
        </button>
      )}
    </Stage>
  )
}
