import { RouteObject } from 'react-router'

const lazyPersonsTimeline: NonNullable<RouteObject['lazy']> = async () => ({
  Component: (await import('./persons-timeline.page')).default,
})

/** /persons-timeline[/:personId] — 인물 대시보드 (ContentShell 사이드바) */
export const personsTimelineRoutes: RouteObject[] = [
  { path: 'persons-timeline', lazy: lazyPersonsTimeline },
  { path: 'persons-timeline/:personId', lazy: lazyPersonsTimeline },
]
