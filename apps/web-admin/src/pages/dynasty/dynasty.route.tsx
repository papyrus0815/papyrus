import type { RouteObject } from 'react-router-dom'

/**
 * /dynasty — 가문 페이지.
 * 좌측 가문 목록은 레이아웃(ContentAreaShell)이 소유한다. 상세 라우트가 없어 선택은
 * `?dynastyId=` + 본문 앵커 스크롤로 처리한다.
 */
export const dynastyRoute: RouteObject = {
  path: 'dynasty',
  lazy: async () => {
    const { default: Component } = await import('./dynasty.page')
    return { Component }
  },
}
