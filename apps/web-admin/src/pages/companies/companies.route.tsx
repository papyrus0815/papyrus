import { RouteObject } from 'react-router-dom'

import { CompaniesListPage } from './companies-list.page'
import { CompanyFormPage } from './company-form.page'
import { CompanyDetailPage } from './detail/company-detail.page'

/**
 * /companies — 목록·상세. 좌측 기업 목록은 레이아웃(ContentAreaShell)이 소유한다.
 * 등록·수정 폼은 전체 폭을 쓰므로 콘텐츠 영역 밖(별도 라우트 그룹)에 둔다.
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

/** 콘텐츠 영역 밖(좌측 목록 없음)에 두는 기업 폼 라우트 */
export const companyFormRoutes: RouteObject[] = [
  { path: 'companies/new', element: <CompanyFormPage /> },
  { path: 'companies/:id/edit', element: <CompanyFormPage /> },
]
