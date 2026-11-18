import { X } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { useBattleActions, useBattleStore } from '@/app/store'

/** Shows the last domain error (localized by code) until dismissed or the next valid action. */
export function ErrorBanner() {
  const { t } = useTranslation()
  const error = useBattleStore((s) => s.lastError)
  const { clearError } = useBattleActions()
  if (!error) return null

  return (
    <div
      role="alert"
      className="flex items-center justify-between gap-3 rounded-lg border border-rose-800 bg-rose-950/80 px-4 py-2 text-sm text-rose-100"
    >
      <span>{t(`master.errors.${error.code}`)}</span>
      <button
        type="button"
        onClick={clearError}
        aria-label={t('master.errors.dismiss')}
        className="rounded p-1 hover:bg-rose-900"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}
