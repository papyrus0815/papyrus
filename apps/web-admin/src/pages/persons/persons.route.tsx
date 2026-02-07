/**
 * 인물 페이지 라우트
 */
import type { RouteObject } from 'react-router-dom'

import PersonCreatePage from '@/pages/persons/person-create.page'
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
      path: 'create',
      element: <PersonCreatePage />,
    },
    {
      // 수정도 같은 컴포넌트 사용 (ID로 구분)
      path: ':id/edit',
      element: <PersonCreatePage />,
    },
    {
      path: ':id',
      element: <PersonDetailPage />,
    },
  ],
}
