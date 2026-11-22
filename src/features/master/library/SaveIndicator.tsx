import { Check, CircleAlert, LoaderCircle } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import type { SaveStatus } from './useAutosave'

/** Quiet autosave feedback: saved, saving, or why it could not save. */
export function SaveIndicator({ status }: { status: SaveStatus }) {
  const { t } = useTranslation()
  const view = {
    saved: { Icon: Check, text: t('library.save.saved'), tone: 'text-slate-400' },
    pending: { Icon: LoaderCircle, text: t('library.save.saving'), tone: 'text-slate-400' },
    invalid: { Icon: CircleAlert, text: t('library.save.invalid'), tone: 'text-rose-300' },
    error: { Icon: CircleAlert, text: t('library.save.invalid'), tone: 'text-rose-300' },
  }[status]
  return (
    <p role="status" className={`inline-flex items-center gap-1.5 text-sm ${view.tone}`}>
      <view.Icon
        className={`h-4 w-4 ${status === 'pending' ? 'motion-safe:animate-spin' : ''}`}
        aria-hidden="true"
      />
      {view.text}
    </p>
  )
}
