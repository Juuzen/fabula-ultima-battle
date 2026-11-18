import { Navigate, type RouteObject } from 'react-router'

import { NotFoundPage } from './NotFoundPage'

// Each window loads only its own page (code splitting). The service worker
// precaches every chunk, so lazy loading still works offline.
export const routes: RouteObject[] = [
  { path: '/', element: <Navigate to="/master" replace /> },
  {
    path: '/master',
    lazy: async () => ({ Component: (await import('@/features/master/MasterPage')).MasterPage }),
  },
  {
    path: '/display',
    lazy: async () => ({ Component: (await import('@/features/display/DisplayPage')).DisplayPage }),
  },
  { path: '*', element: <NotFoundPage /> },
]
