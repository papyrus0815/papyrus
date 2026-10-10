import { RouteObject } from 'react-router-dom'

import { CompaniesListPage } from './companies-list.page'
import { CompanyDetailPage } from './detail/company-detail.page'

/**
 * /companies — 목록·상세. 좌측 기업 목록은 레이아웃(ContentAreaShell)이 소유한다.
 * 등록·수정은 풀 페이지가 아니라 `CompanyRegisterModal`(widgets/company-form)이다 —
 * 예전 `/companies/new`·`/companies/:id/edit` 라우트는 폐지했다.
 */
export const companiesRoutes: RouteObject[] = [
  {
    path: 'companies',
    children: [
      { index: true, element: <CompaniesListPage /> },
      { path: ':id', element: <CompanyDetailPage /> },
    ],
  },
]
