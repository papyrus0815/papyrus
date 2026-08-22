import type { RouteObject } from 'react-router-dom'

import { SidebarOutletShell } from '@/widgets/content-shell'
import { DynastyListSidebar } from '@/widgets/domain-sidebars'

/**
 * /dynasty — 가문 페이지. 좌측 가문 목록 + 우측 본문.
 * 상세 라우트가 없어 선택은 `?dynastyId=` + 본문 앵커 스크롤로 처리한다.
 */
export const dynastyRoute: RouteObject = {
  path: 'dynasty',
  element: (
    <SidebarOutletShell
      storageKey="dynasty-list-collapsed"
      renderSidebar={(context) => <DynastyListSidebar {...context} />}
    />
  ),
  children: [
    {
      index: true,
      lazy: async () => {
        const { default: Component } = await import('./dynasty.page')
        return { Component }
      },
    },
  ],
}
