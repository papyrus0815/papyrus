/**
 * 인물 페이지 라우트
 */
import type { RouteObject } from 'react-router-dom'

import PersonDetailPage from '@/pages/persons/person-detail.page'
import PersonPage from '@/pages/persons/person.page'

export const personsRoute: RouteObject = {
  path: 'persons',
  children: [
    {
      index: true,
      element: <PersonPage />,
    },
    {
      path: ':id',
      element: <PersonDetailPage />,
    },
  ],
}
