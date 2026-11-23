import { useTranslation } from 'react-i18next'

import type { AssetRole } from '@/domain'

import type { UploadProblem } from './uploadAsset'

/** What to tell the GM when an upload fails. */
export function useUploadMessage() {
  const { t } = useTranslation()
  return (problem: UploadProblem, role: AssetRole) =>
    problem === 'failed'
      ? t('assets.errors.failed')
      : problem === 'unsupported'
        ? t('assets.errors.unsupported')
        : t('assets.errors.wrongShelf', { accepts: t(`assets.accepts.${role}`) })
}
