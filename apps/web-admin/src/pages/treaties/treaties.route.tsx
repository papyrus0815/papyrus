import { RouteObject } from 'react-router-dom'

import { TreatiesListPage } from './treaties-list.page'
import { TreatyDetailPage } from './treaty-detail.page'

/**
 * /treaties — 조약 카탈로그 목록·상세.
 * 좌측 조약 목록은 레이아웃(ContentAreaShell)이 소유한다.
 */
export const treatiesRoutes: RouteObject[] = [
  {
    path: 'treaties',
    children: [
      { index: true, element: <TreatiesListPage /> },
      { path: ':id', element: <TreatyDetailPage /> },
    ],
  },
]
