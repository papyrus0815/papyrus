import { RouteObject } from 'react-router-dom'

import { OrganizationsListPage } from './organizations-list.page'
import { OrganizationFormPage } from './organization-form.page'

/** 카탈로그·허브 본문 — ContentLayout 안에서 다른 도메인(/treaties·/government·/companies)과 동일한 셸 규약을 따른다 */
export const organizationsPageRoute: RouteObject = {
  path: 'organizations',
  element: <OrganizationsListPage />,
}

/** 풀폭 등록·수정 폼 — ContentLayout 밖에서 전체 폭 사용 */
export const organizationFormRoutes: RouteObject[] = [
  {
    path: 'organizations/new',
    element: <OrganizationFormPage />,
  },
  {
    path: 'organizations/:id/edit',
    element: <OrganizationFormPage />,
  },
]

/** 하위 호환용 통합 export */
export const organizationsRoutes: RouteObject[] = [
  organizationsPageRoute,
  ...organizationFormRoutes,
]
