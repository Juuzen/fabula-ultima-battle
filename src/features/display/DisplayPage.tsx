import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useSearchParams } from 'react-router'

import { demoBattle } from './demo/demoBattle'
import { BattleScene } from './scene/BattleScene'
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
        <BattleScene battle={battle} />
      ) : (
        <>
          <div className="absolute inset-0 bg-linear-to-b from-indigo-950 via-slate-900 to-black" />
          {started && (
            <p className="font-display absolute inset-x-0 bottom-24 text-center text-4xl tracking-widest text-slate-300">
              {t('display.waiting')}
            </p>
          )}
        </>
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
