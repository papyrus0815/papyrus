import type { RouteObject } from 'react-router-dom'
import { useParams } from 'react-router-dom'

import { SidebarOutletShell } from '@/widgets/content-shell'
import { PersonGroupListSidebar } from '@/widgets/domain-sidebars'

/** 선택 표시를 위해 현재 URL의 :groupId를 사이드바에 넘긴다 (라우터 컨텍스트 안에서 읽어야 한다) */
function PersonGroupsSidebar({
  collapsed,
  onToggleCollapse,
}: {
  collapsed: boolean
  onToggleCollapse: () => void
}) {
  const params = useParams<{ groupId?: string }>()
  return (
    <PersonGroupListSidebar
      selectedId={params.groupId ?? null}
      collapsed={collapsed}
      onToggleCollapse={onToggleCollapse}
    />
  )
}

/**
 * /person-groups — 인물 묶음 허브. 좌측 묶음 목록 + 우측(목록/상세).
 * layout route라 목록↔상세를 오가도 사이드바가 유지된다.
 */
export const personGroupsRoutes: RouteObject[] = [
  {
    path: 'person-groups',
    element: (
      <SidebarOutletShell
        storageKey="person-groups-list-collapsed"
        renderSidebar={(context) => <PersonGroupsSidebar {...context} />}
      />
    ),
    children: [
      {
        index: true,
        lazy: async () => {
          const { default: Component } = await import('./person-groups-list.page')
          return { Component }
        },
      },
      {
        path: ':groupId',
        lazy: async () => {
          const { default: Component } = await import('./person-group-detail.page')
          return { Component }
        },
      },
    ],
  },
]
