import { RouteObject } from 'react-router'

const lazyPersonsTimeline: NonNullable<RouteObject['lazy']> = async () => ({
  Component: (await import('./persons-timeline.page')).default,
})

const lazyPersonEdit: NonNullable<RouteObject['lazy']> = async () => ({
  Component: (await import('./person-edit.page')).default,
})

/** /persons-timeline[/:personId] — 인물 대시보드 (ContentShell 사이드바) */
export const personsTimelineRoutes: RouteObject[] = [
  { path: 'persons-timeline', lazy: lazyPersonsTimeline },
  { path: 'persons-timeline/:personId', lazy: lazyPersonsTimeline },
]

/**
 * /persons-timeline/create · /persons-timeline/:personId/edit — 풀 페이지 등록/수정 폼.
 * 대시보드와 URL 프리픽스는 같지만 ContentLayout 셸 없이 자체 100vh 레이아웃을 그리므로
 * browser-router에서 ContentLayout 그룹 밖(Layout 직속)에 등록한다.
 * (라우트 랭킹은 트리 전역 — 정적 'create'가 ':personId'보다 우선 매칭되므로 그룹이 달라도 안전)
 */
export const personFormRoutes: RouteObject[] = [
  { path: 'persons-timeline/create', lazy: lazyPersonEdit },
  { path: 'persons-timeline/:personId/edit', lazy: lazyPersonEdit },
]
