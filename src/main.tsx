import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'

import '@fontsource-variable/inter'
import '@fontsource/cinzel/600.css'
import '@fontsource/cinzel/700.css'

import { App } from '@/app/App'
import '@/shared/i18n'
import './index.css'

registerSW({ immediate: true })

const rootElement = document.getElementById('root')
if (!rootElement) throw new Error('Root element #root not found')

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
