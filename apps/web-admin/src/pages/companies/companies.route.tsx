import { RouteObject } from 'react-router-dom'
import { useParams } from 'react-router-dom'

import { SidebarOutletShell } from '@/widgets/content-shell'
import { CompanyListSidebar } from '@/widgets/domain-sidebars'

import { CompaniesListPage } from './companies-list.page'
import { CompanyFormPage } from './company-form.page'
import { CompanyDetailPage } from './detail/company-detail.page'

function CompaniesSidebar({
  collapsed,
  onToggleCollapse,
}: {
  collapsed: boolean
  onToggleCollapse: () => void
}) {
  const params = useParams<{ id?: string }>()
  return (
    <CompanyListSidebar
      selectedId={params.id ?? null}
      collapsed={collapsed}
      onToggleCollapse={onToggleCollapse}
    />
  )
}

/**
 * /companies — 좌측 기업 목록 + 우측(목록/상세).
 * 등록·수정 폼은 전체 폭을 쓰므로 셸 밖에 둔다.
 */
export const companiesRoutes: RouteObject[] = [
  {
    path: 'companies',
    children: [
      { path: 'new', element: <CompanyFormPage /> },
      { path: ':id/edit', element: <CompanyFormPage /> },
      {
        element: (
          <SidebarOutletShell
            storageKey="companies-list-collapsed"
            renderSidebar={(context) => <CompaniesSidebar {...context} />}
          />
        ),
        children: [
          { index: true, element: <CompaniesListPage /> },
          { path: ':id', element: <CompanyDetailPage /> },
        ],
      },
    ],
  },
]
