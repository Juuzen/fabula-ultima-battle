import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { LanguageSwitcher } from '@/shared/ui/LanguageSwitcher'

import { openDisplayWindow } from './openDisplayWindow'

/** Game Master dashboard. Owns the authoritative battle state (from phase 1 on). */
export function MasterPage() {
  const { t } = useTranslation()
  const [popupBlocked, setPopupBlocked] = useState(false)

  const handleOpenDisplay = () => {
    setPopupBlocked(openDisplayWindow() === null)
  }

  return (
    <main className="min-h-screen bg-slate-950 p-8 text-slate-100">
      <header className="mb-8 flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl tracking-wide">{t('master.title')}</h1>
          <p className="mt-1 text-slate-400">{t('master.subtitle')}</p>
        </div>
        <LanguageSwitcher />
      </header>

      <section className="max-w-xl rounded-lg border border-slate-800 bg-slate-900 p-6">
        <button
          type="button"
          onClick={handleOpenDisplay}
          className="rounded-md bg-indigo-600 px-4 py-2 font-medium hover:bg-indigo-500"
        >
          {t('master.openDisplay')}
        </button>
        <p className="mt-3 text-sm text-slate-400">{t('master.openDisplayHint')}</p>
        {popupBlocked && (
          <p role="alert" className="mt-3 text-sm text-rose-400">
            {t('master.popupBlocked')}
          </p>
        )}
      </section>
    </main>
  )
}
