import { Navigate, type RouteObject } from 'react-router'

import { DisplayPage } from '@/features/display/DisplayPage'
import { MasterPage } from '@/features/master/MasterPage'

import { NotFoundPage } from './NotFoundPage'

export const routes: RouteObject[] = [
  { path: '/', element: <Navigate to="/master" replace /> },
  { path: '/master', element: <MasterPage /> },
  { path: '/display', element: <DisplayPage /> },
  { path: '*', element: <NotFoundPage /> },
]
