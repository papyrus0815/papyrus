import { redirect, RouteObject } from 'react-router'

import { ROUTES } from '../../shared/constants/routes'
import HistoryLayout from '../../widgets/history-layout/history-layout.ui'

/**
 * 🗺️ History 페이지 라우트 설정
 *
 * - 모든 페이지 lazy 로드 (초기 번들 최소화)
 * - 국가 상세는 layout route(`CountryDetailShell`) + 하위 콘텐츠 페이지로 분리 —
 *   sub-route 전환 시 셸·데이터·모달이 보존된다.
 */
type Lazy = NonNullable<RouteObject['lazy']>

/** 국가 상세 layout 셸 — 좌측 리스트·모달·데이터 보유. loader는 셸에 매달림. */
const lazyCountryDetailShell: Lazy = async () => {
  const [{ countryLoader }, { CountryDetailShell }] = await Promise.all([
    import('./country/country.loader'),
    import('./country/country-detail-shell'),
  ])
  return { loader: countryLoader, Component: CountryDetailShell }
}

/** 셸의 자식 — 기본 탭(detail) 콘텐츠. */
const lazyCountryDetailContent: Lazy = async () => ({
  Component: (await import('./country/country-detail.page')).default,
})

/** 셸의 자식 — events 탭 콘텐츠. */
const lazyCountryDetailEventsContent: Lazy = async () => ({
  Component: (await import('./country/country-detail-events.page')).default,
})

/** 대시보드 페이지들 — Component만 lazy 로드 (loader 불필요) */
const lazyDashboardPersons: Lazy = async () => ({
  Component: (await import('./dashboard/dashboard-persons.page')).default,
})
const lazyDashboardSimple: Lazy = async () => ({
  Component: (await import('./dashboard/dashboard-simple.page')).default,
})

/** 역대 수장 통합 비교 — Component만 lazy 로드 */
const lazyHeadsOfState: Lazy = async () => ({
  Component: (await import('./heads-of-state/heads-of-state.page')).default,
})

/** 대시보드 URL 세그먼트 → 라우트 생성. 가문은 /dynasty 풀 페이지로 이전. */
const dashboardSimpleRoutes = (
  ['ethnicity', 'legislature', 'military'] as const
).map((seg) => ({
  path: `${ROUTES.HISTORY.DASHBOARD}/${seg}`,
  lazy: lazyDashboardSimple,
}))

/**
 * 셸이 떠받치는 sub-route 자식들. events만 별도 콘텐츠 페이지, 그 외 탭 세그먼트는
 * 모두 detail 콘텐츠 페이지(`country-detail.page`)로 매핑되어 `CountryDetail` 위젯이
 * `initialDetailTab`을 보고 적절한 탭을 연다.
 */
const countryDetailChildSegments = [
  'dashboard',
  'heads-of-state',
  'persons',
  'historical',
  'regions',
  'government',
  'elections',
  'elections/party/:partyId',
  'laws',
  'ethnicity',
  'treaty',
] as const

const countryDetailChildren: RouteObject[] = [
  // /history/country (no ID) — EmptyState
  { index: true, lazy: lazyCountryDetailContent },
  // /history/country/:countryId — 기본 콘텐츠 (탭 미지정 → CountryDetail이 dashboard로 폴백)
  { path: ':countryId', lazy: lazyCountryDetailContent },
  // /history/country/:countryId/<segment> — detail 콘텐츠 (CountryDetail 위젯이 탭 매핑)
  ...countryDetailChildSegments.map((seg) => ({
    path: `:countryId/${seg}`,
    lazy: lazyCountryDetailContent,
  })),
  // /history/country/:countryId/events — 별도 콘텐츠 페이지
  { path: ':countryId/events', lazy: lazyCountryDetailEventsContent },
]

export const historyPageRoute: RouteObject = {
  path: ROUTES.HISTORY.ROOT,
  children: [
    {
      element: <HistoryLayout />,
      children: [
        // /history/country[/:countryId/*] — 셸 layout route + 하위 콘텐츠 라우트
        {
          path: ROUTES.HISTORY.COUNTRY,
          lazy: lazyCountryDetailShell,
          children: countryDetailChildren,
        },

        // /history/heads-of-state — 역대 수장 통합 비교 (현대·역사 국가 모두)
        { path: ROUTES.HISTORY.HEADS_OF_STATE, lazy: lazyHeadsOfState },

        // /history/dashboard/* — 대시보드 페이지들
        {
          path: `${ROUTES.HISTORY.DASHBOARD}/persons`,
          lazy: lazyDashboardPersons,
        },
        {
          path: `${ROUTES.HISTORY.DASHBOARD}/persons/:personId`,
          lazy: lazyDashboardPersons,
        },
        ...dashboardSimpleRoutes,

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
      ],
    },
  ],
}
