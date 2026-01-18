/**
 * 인물 페이지 라우트
 */
import type { RouteObject } from 'react-router-dom'

import PersonCreatePage from '@/pages/persons/person-create.page'
import PersonDetailPage from '@/pages/persons/person-detail.page'
import PersonEditPage from '@/pages/persons/person-edit.page'
import PersonPage from '@/pages/persons/person.page'

export const personsRoute: RouteObject = {
  path: 'persons',
  children: [
    {
      index: true,
      element: <PersonPage />,
    },
    {
      path: 'create',
      element: <PersonCreatePage />,
    },
    {
      path: ':id/edit',
      element: <PersonEditPage />,
    },
    {
      path: ':id',
      element: <PersonDetailPage />,
    },
  ],
}
