import { useTranslation } from 'react-i18next'

import { useStorageEstimate } from '@/app/library/assetHooks'

import { formatBytes } from './uploadAsset'

/** How much of the browser's storage the app uses (shown once there is something to count). */
export function StorageEstimate() {
  const { t } = useTranslation()
  const estimate = useStorageEstimate()
  if (!estimate || estimate.files === 0) return null
  return (
    <p className="text-xs text-slate-400 tabular-nums">
      {t('assets.storage', {
        used: formatBytes(estimate.used),
        quota: formatBytes(estimate.quota),
      })}
    </p>
  )
}
