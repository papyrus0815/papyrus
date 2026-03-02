/**
 * 인물 페이지 라우트
 * - 목록(/persons)에서 등록 클릭 시 같은 페이지에서 등록 폼으로 전환
 * - /persons/create 직접 접근 시 PersonCreatePage (스텝 폼)
 * - 수정: PersonCreatePage (기존 스텝 폼)
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
      path: ':id/edit',
      element: <PersonCreatePage />,
    },
    {
      path: ':id',
      element: <PersonDetailPage />,
    },
  ],
}
