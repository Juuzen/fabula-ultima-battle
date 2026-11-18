import i18n from 'i18next'
import LanguageDetector from 'i18next-browser-languagedetector'
import { initReactI18next } from 'react-i18next'

import enCommon from './locales/en/common.json'
import itCommon from './locales/it/common.json'

export const SUPPORTED_LANGUAGES = ['it', 'en'] as const
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number]

export const defaultNS = 'common'
export const resources = {
  it: { common: itCommon },
  en: { common: enCommon },
} as const

void i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    defaultNS,
    fallbackLng: 'it',
    supportedLngs: SUPPORTED_LANGUAGES,
    interpolation: { escapeValue: false }, // React already escapes
    detection: {
      // Shared by both windows (same origin), so Master and Display stay in the same language.
      order: ['localStorage', 'navigator'],
      lookupLocalStorage: 'fu-battle.lang',
      caches: ['localStorage'],
    },
  })

export default i18n
