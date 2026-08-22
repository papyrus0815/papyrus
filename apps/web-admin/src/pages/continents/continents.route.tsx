import { RouteObject } from 'react-router'

import { SidebarOutletShell } from '@/widgets/content-shell'
import { ContinentListSidebar } from '@/widgets/domain-sidebars'

/**
 * /continents — 대륙 페이지. 좌측 대륙 목록 + 우측 본문.
 * 사이드바 행을 고르면 `?continentId=`가 붙고 본문의 해당 카드로 스크롤한다.
 */
export const continentsRoute: RouteObject = {
  path: 'continents',
  element: (
    <SidebarOutletShell
      storageKey="continents-list-collapsed"
      renderSidebar={(context) => <ContinentListSidebar {...context} />}
    />
  ),
  children: [
    {
      index: true,
      lazy: async () => {
        const [{ continentsLoader }, { default: Component }] = await Promise.all([
          import('./continents.loader'),
          import('./continents.page'),
        ])
        return { loader: continentsLoader, Component }
      },
    },
  ],
}
