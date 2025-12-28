import { RouteObject } from 'react-router-dom'

/**
 * 🗺️ Dashboard (Home) 페이지 라우트 설정
 *
 * 루트 경로(/)에서 홈 페이지를 표시합니다.
 * Lazy loading으로 초기 번들 크기를 최적화합니다.
 */
export const dashboardRoute: RouteObject = {
  index: true,
  lazy: async () => {
    const { default: Component } = await import('./dashboard.page')
    return { Component }
  },
}
