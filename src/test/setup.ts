import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import 'fake-indexeddb/auto'
import { MotionGlobalConfig } from 'motion/react'
import { afterEach } from 'vitest'

import i18n from '@/shared/i18n'

// Animations complete instantly: tests check end states, not frames.
MotionGlobalConfig.skipAnimations = true

// Deterministic language in tests.
await i18n.changeLanguage('it')

afterEach(() => {
  cleanup()
})
