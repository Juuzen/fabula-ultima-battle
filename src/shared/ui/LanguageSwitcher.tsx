import { useTranslation } from 'react-i18next'

import { SUPPORTED_LANGUAGES } from '@/shared/i18n'

export function LanguageSwitcher() {
  const { t, i18n } = useTranslation()

  return (
    <label className="flex items-center gap-2 text-sm text-slate-300">
      {t('language.label')}
      <select
        className="rounded border border-slate-600 bg-slate-800 px-2 py-1 text-slate-100"
        value={i18n.resolvedLanguage}
        onChange={(e) => void i18n.changeLanguage(e.target.value)}
      >
        {SUPPORTED_LANGUAGES.map((lng) => (
          <option key={lng} value={lng}>
            {t(`language.${lng}`)}
          </option>
        ))}
      </select>
    </label>
  )
}
