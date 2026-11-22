import { render } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'

import { AudioLibraryPage } from './assets/AudioLibraryPage'
import { VideoLibraryPage } from './assets/VideoLibraryPage'
import { UnitLibraryPage } from './library/UnitLibraryPage'
import { SceneLibraryPage } from './scenes/SceneLibraryPage'
import { ScreenControlPage } from './screen/ScreenControlPage'
import { MasterLayout } from './shell/MasterLayout'

/** Renders the Master shell eagerly (no lazy routes), at Screen Control by default. */
export function renderMaster(path = '/master/screen') {
  const router = createMemoryRouter(
    [
      {
        path: '/master',
        element: <MasterLayout />,
        children: [
          { path: 'screen', element: <ScreenControlPage /> },
          { path: 'party', element: <UnitLibraryPage kind="party" /> },
          { path: 'enemies', element: <UnitLibraryPage kind="enemy" /> },
          { path: 'scenes', element: <SceneLibraryPage /> },
          { path: 'audio', element: <AudioLibraryPage /> },
          { path: 'video', element: <VideoLibraryPage /> },
        ],
      },
    ],
    { initialEntries: [path] },
  )
  render(<RouterProvider router={router} />)
  return router
}
