import { Navigate, RouteObject } from 'react-router-dom'

/*
 * 카테고리 관리는 기업 목록 위 모달(CompanyCategoryManagerModal)로 옮겼다.
 * 옛 주소(목록·new·:id/edit)는 북마크가 깨지지 않게 기업 목록으로 보내면서 모달을 연다.
 */
const toManager = <Navigate to="/companies/?categories=open" replace />

export const companyCategoriesRoutes: RouteObject[] = [
  {
    path: 'company-categories',
    children: [
      { index: true, element: toManager },
      { path: 'new', element: toManager },
      { path: ':id/edit', element: toManager },
    ],
  },
]
