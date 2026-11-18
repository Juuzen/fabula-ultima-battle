import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import 'fake-indexeddb/auto'
import { afterEach } from 'vitest'

import i18n from '@/shared/i18n'

// Deterministic language in tests.
await i18n.changeLanguage('it')

afterEach(() => {
  cleanup()
})
