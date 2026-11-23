import { useCallback } from 'react'
import { useTranslation } from 'react-i18next'

import { useCustomEffects } from '@/app/library/assetHooks'
import { customEffectId, isBuiltinEffect, type EffectRef } from '@/domain'

/** Display name of any effect: built-in ones are translated, custom ones have the GM's name. */
export function useEffectName(): (effect: EffectRef | null) => string {
  const { t } = useTranslation()
  const customEffects = useCustomEffects()
  return useCallback(
    (effect) => {
      if (!effect) return t('effects.none')
      if (isBuiltinEffect(effect)) return t(`effects.${effect}`)
      const id = customEffectId(effect)
      return customEffects?.find((e) => e.id === id)?.name ?? t('effects.missing')
    },
    [t, customEffects],
  )
}
