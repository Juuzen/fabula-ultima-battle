import { Languages } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { SUPPORTED_LANGUAGES } from '@/shared/i18n'

/** Compact switcher for the Master's JRPG sidebar: language codes, label hidden on the icon rail. */
export function LanguageSwitcher() {
  const { t, i18n } = useTranslation()

  return (
    <label className="flex items-center justify-center gap-2 text-sm text-indigo-100 min-[1440px]:justify-start">
      <Languages className="h-4 w-4 shrink-0 max-[1439px]:hidden" aria-hidden="true" />
      <span className="max-[1439px]:sr-only">{t('language.label')}</span>
      <select
        className="h-8 rounded-md border border-white/30 bg-[#0c1446] px-1.5 text-sm font-medium text-white uppercase focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white min-[1440px]:ml-auto"
        value={i18n.resolvedLanguage}
        onChange={(e) => void i18n.changeLanguage(e.target.value)}
      >
        {SUPPORTED_LANGUAGES.map((lng) => (
          <option key={lng} value={lng} aria-label={t(`language.${lng}`)}>
            {lng}
          </option>
        ))}
      </select>
    </label>
  )
}
