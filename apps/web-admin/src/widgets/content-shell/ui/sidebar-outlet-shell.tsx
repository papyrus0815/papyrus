/**
 * 좌측 사이드바 + `<Outlet/>` 조합의 라우트 레벨 셸.
 *
 * 지면마다 "ContentShell을 열고 left에 사이드바, right에 Outlet"을 똑같이 반복하게 되므로
 * 한 컴포넌트로 묶는다. 도메인이 다른 건 사이드바 하나뿐이다.
 *
 * 라우트에서 이렇게 쓴다:
 *   element: <SidebarOutletShell storageKey="companies-list-collapsed"
 *              renderSidebar={(ctx) => <CompanyListSidebar {...ctx} />} />
 */
import React from 'react'

import { Outlet } from 'react-router-dom'

import { ContentShell, type ContentShellRenderContext } from './content-shell'

interface SidebarOutletShellProps {
  /** 접힘 상태 localStorage 키 — 지면마다 분리 */
  storageKey: string
  defaultCollapsed?: boolean
  renderSidebar: (context: {
    collapsed: boolean
    onToggleCollapse: () => void
  }) => React.ReactNode
}

export function SidebarOutletShell({
  storageKey,
  defaultCollapsed = false,
  renderSidebar,
}: SidebarOutletShellProps) {
  return (
    <ContentShell
      /* 모바일(≤1024px)에서는 좌측이 숨겨지므로 우측 본문을 반드시 노출해야 한다 */
      mobileDetailVisible
      listCollapsedConfig={{ storageKey, defaultCollapsed }}
      left={({ listCollapsed, toggleListCollapsed }: ContentShellRenderContext) =>
        renderSidebar({
          collapsed: listCollapsed,
          onToggleCollapse: toggleListCollapsed,
        })
      }
      right={<Outlet />}
    />
  )
}
