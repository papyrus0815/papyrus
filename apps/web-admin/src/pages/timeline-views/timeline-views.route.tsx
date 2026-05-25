import { RouteObject } from 'react-router'

import type { TimelineSimpleView } from './timeline-view.page'

/**
 * /ethnicity, /legislature, /military — 단순 timeline 뷰 (ContentShell 공유).
 * 페이지는 한 컴포넌트(`timeline-view.page`)를 공유하고, view 종류는 라우트에서 prop으로 주입.
 */
const lazyTimelineView =
  (view: TimelineSimpleView): NonNullable<RouteObject['lazy']> =>
  async () => {
    const { default: Page } = await import('./timeline-view.page')
    return { Component: () => <Page view={view} /> }
  }

export const timelineViewsRoutes: RouteObject[] = (
  ['ethnicity', 'legislature', 'military'] as const
).map((view) => ({ path: view, lazy: lazyTimelineView(view) }))
