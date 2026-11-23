import { Navigate, type RouteObject } from 'react-router'

import { NotFoundPage } from './NotFoundPage'

/** Party and Enemies share one library page, one kind of sheet each. */
const LIBRARY_SECTIONS = [
  { path: 'party', kind: 'party' },
  { path: 'enemies', kind: 'enemy' },
] as const

// Each window loads only its own page (code splitting). The service worker
// precaches every chunk, so lazy loading still works offline.
export const routes: RouteObject[] = [
  { path: '/', element: <Navigate to="/master" replace /> },
  {
    path: '/master',
    lazy: async () => ({
      Component: (await import('@/features/master/shell/MasterLayout')).MasterLayout,
    }),
    children: [
      { index: true, element: <Navigate to="screen" replace /> },
      {
        path: 'screen',
        lazy: async () => ({
          Component: (await import('@/features/master/screen/ScreenControlPage')).ScreenControlPage,
        }),
      },
      ...LIBRARY_SECTIONS.map(({ path, kind }): RouteObject => ({
        path,
        lazy: async () => {
          const { UnitLibraryPage } = await import('@/features/master/library/UnitLibraryPage')
          return { element: <UnitLibraryPage kind={kind} /> }
        },
      })),
      {
        path: 'scenes',
        lazy: async () => ({
          Component: (await import('@/features/master/scenes/SceneLibraryPage')).SceneLibraryPage,
        }),
      },
      {
        path: 'audio',
        lazy: async () => ({
          Component: (await import('@/features/master/assets/AudioLibraryPage')).AudioLibraryPage,
        }),
      },
      {
        path: 'video',
        lazy: async () => ({
          Component: (await import('@/features/master/assets/VideoLibraryPage')).VideoLibraryPage,
        }),
      },
    ],
  },
  {
    path: '/display',
    lazy: async () => ({ Component: (await import('@/features/display/DisplayPage')).DisplayPage }),
  },
  { path: '*', element: <NotFoundPage /> },
]
