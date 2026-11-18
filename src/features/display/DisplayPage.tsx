import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { Stage } from './stage/Stage'

/**
 * Player-facing screen. Read-only: it renders whatever the Master sends.
 * The first click unlocks audio playback (browser autoplay policy).
 */
export function DisplayPage() {
  const { t } = useTranslation()
  const [started, setStarted] = useState(false)

  return (
    <Stage>
      <div className="absolute inset-0 bg-linear-to-b from-indigo-950 via-slate-900 to-black" />

      {started ? (
        <p className="font-display absolute inset-x-0 bottom-24 text-center text-4xl tracking-widest text-slate-300">
          {t('display.waiting')}
        </p>
      ) : (
        <button
          type="button"
          onClick={() => setStarted(true)}
          className="absolute inset-0 flex cursor-pointer flex-col items-center justify-center gap-6 text-slate-100"
        >
          <span className="font-display text-7xl tracking-widest">{t('display.start')}</span>
          <span className="text-2xl text-slate-400">{t('display.startHint')}</span>
        </button>
      )}
    </Stage>
  )
}
