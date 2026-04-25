import { redirect, RouteObject } from 'react-router'

import { ROUTES } from '../../shared/constants/routes'
import HistoryLayout from '../../widgets/history-layout/history-layout.ui'

/**
 * 🗺️ History 페이지 라우트 설정
 *
 * - 모든 페이지 lazy 로드 (초기 번들 최소화)
 * - 국가 상세만 loader + Component 병렬 로드, 나머지는 Component만
 */
type Lazy = NonNullable<RouteObject['lazy']>

/** 국가 상세 페이지 — loader + Component 병렬 로드 */
const lazyCountryDetail: Lazy = async () => {
  const [{ countryLoader }, { default: Component }] = await Promise.all([
    import('./country/country.loader'),
    import('./country/country-detail.page'),
  ])
  return { loader: countryLoader, Component }
}

/** 대시보드 페이지들 — Component만 lazy 로드 (loader 불필요) */
const lazyDashboardStats: Lazy = async () => ({
  Component: (await import('./dashboard/dashboard-stats.page')).default,
})
const lazyDashboardPersons: Lazy = async () => ({
  Component: (await import('./dashboard/dashboard-persons.page')).default,
})
const lazyDashboardEvents: Lazy = async () => ({
  Component: (await import('./dashboard/dashboard-events.page')).default,
})
const lazyDashboardAdministration: Lazy = async () => ({
  Component: (await import('./dashboard/dashboard-administration.page')).default,
})
const lazyDashboardSimple: Lazy = async () => ({
  Component: (await import('./dashboard/dashboard-simple.page')).default,
})

/** 대시보드 URL 세그먼트 → 라우트 생성. 가문은 /dynasty 풀 페이지로 이전. */
const dashboardSimpleRoutes = (
  ['ethnicity', 'legislature', 'military'] as const
).map((seg) => ({
  path: `${ROUTES.HISTORY.DASHBOARD}/${seg}`,
  lazy: lazyDashboardSimple,
}))

/** 국가 상세 하위 탭 세그먼트 */
const countryDetailTabSegments = [
  'dashboard',
  'heads-of-state',
  'persons',
  'historical',
  'regions',
  'government',
  'elections',
  'elections/party/:partyId',
  'laws',
  'events',
] as const
const countryDetailRoutes = countryDetailTabSegments.map((seg) => ({
  path: `${ROUTES.HISTORY.COUNTRY}/:countryId/${seg}`,
  lazy: lazyCountryDetail,
}))

export const historyPageRoute: RouteObject = {
  path: ROUTES.HISTORY.ROOT,
  children: [
    {
      element: <HistoryLayout />,
      children: [
        // /history — 통계 대시보드 (인덱스)
        { index: true, lazy: lazyDashboardStats },

        // /history/country — 좌측 리스트 + 우측 empty state (선택 안내)
        { path: ROUTES.HISTORY.COUNTRY, lazy: lazyCountryDetail },

        // /history/dashboard/* — 대시보드 페이지들
        {
          path: `${ROUTES.HISTORY.DASHBOARD}/persons`,
          lazy: lazyDashboardPersons,
        },
        {
          path: `${ROUTES.HISTORY.DASHBOARD}/persons/:personId`,
          lazy: lazyDashboardPersons,
        },
        {
          path: `${ROUTES.HISTORY.DASHBOARD}/events/:eventId/edit`,
          lazy: lazyDashboardEvents,
        },
        {
          path: `${ROUTES.HISTORY.DASHBOARD}/events/:eventId`,
          lazy: lazyDashboardEvents,
        },
        {
          path: `${ROUTES.HISTORY.DASHBOARD}/events`,
          lazy: lazyDashboardEvents,
        },
        {
          path: `${ROUTES.HISTORY.DASHBOARD}/${ROUTES.HISTORY.DASHBOARD_ADMINISTRATION}`,
          lazy: lazyDashboardAdministration,
        },
        ...dashboardSimpleRoutes,
        { path: ROUTES.HISTORY.DASHBOARD, lazy: lazyDashboardStats },

        // /history/country/:countryId/* — 국가 상세 (탭별)
        ...countryDetailRoutes,
        { path: `${ROUTES.HISTORY.COUNTRY}/:countryId`, lazy: lazyCountryDetail },

        // 대륙 / 왕조 / 포스트
        {
          path: ROUTES.HISTORY.CONTINENTS,
          lazy: async () => {
            const [{ continentsLoader }, { default: Component }] =
              await Promise.all([
                import('./continents/continents.loader'),
                import('./continents/continents.page'),
              ])
            return { loader: continentsLoader, Component }
          },
        },
        // 가문은 /dynasty 풀 페이지로 이전됨. 잔존 북마크 흡수용 redirect만 유지.
        {
          path: 'dynasties',
          loader: () => redirect('/dynasty'),
        },
        {
          path: 'dynasties/:dynastyId',
          loader: () => redirect('/dynasty'),
        },
        {
          path: 'dashboard/dynasty',
          loader: () => redirect('/dynasty'),
        },
        {
          path: ROUTES.HISTORY.POST,
          lazy: async () => {
            const { default: PostPage } = await import('./post/post.page')
            return { Component: PostPage }
          },
        },
      ],
    },
  ],
}
