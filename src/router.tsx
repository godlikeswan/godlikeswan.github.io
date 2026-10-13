import { createBrowserRouter } from 'react-router'
import { RootLayout } from './layouts/RootLayout'
import { GroupPage } from './pages/GroupPage'
import { HomePage } from './pages/HomePage'
import { NotFoundPage } from './pages/NotFoundPage'
import { RepoDetailPage } from './pages/RepoDetailPage'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <RootLayout />,
    children: [
      { index: true, element: <HomePage /> },
      { path: 'repos/:repo', element: <RepoDetailPage /> },
      { path: ':group', element: <GroupPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
])
