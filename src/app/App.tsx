import { MotionConfig } from 'motion/react'
import { createHashRouter, RouterProvider } from 'react-router'

import { routes } from './router/routes'

// Hash routing (#/master, #/display) works offline and from any static host without rewrites.
const router = createHashRouter(routes)

export function App() {
  // Animations honour the OS "reduce motion" setting.
  return (
    <MotionConfig reducedMotion="user">
      <RouterProvider router={router} />
    </MotionConfig>
  )
}
