import { redirect, RouteObject, type LoaderFunctionArgs } from 'react-router'

import { pathKeys } from '../../shared/router'

/**
 * 🗺️ 국가 상세 라우트 — `/country[/:countryId/*]`
 *
 * - 모든 페이지 lazy 로드 (초기 번들 최소화)
 * - 국가 상세는 layout route(`CountryDetailShell`) + 하위 콘텐츠 페이지로 분리 —
 *   sub-route 전환 시 셸·데이터·모달이 보존된다.
 */
type Lazy = NonNullable<RouteObject['lazy']>

/** 국가 상세 layout 셸 — 좌측 리스트·모달·데이터 보유. */
const lazyCountryDetailShell: Lazy = async () => {
  const { CountryDetailShell } = await import('./country-detail-shell')
  return { Component: CountryDetailShell }
}

/** 셸의 자식 — 기본 탭(detail) 콘텐츠. */
const lazyCountryDetailContent: Lazy = async () => ({
  Component: (await import('./country-detail.page')).default,
})

/** 셸의 자식 — events 탭 콘텐츠. */
const lazyCountryDetailEventsContent: Lazy = async () => ({
  Component: (await import('./country-detail-events.page')).default,
})

/**
 * 셸이 떠받치는 sub-route 자식들. events만 별도 콘텐츠 페이지, 그 외 탭 세그먼트는
 * 모두 detail 콘텐츠 페이지(`country-detail.page`)로 매핑되어 `CountryDetail` 위젯이
 * `initialDetailTab`을 보고 적절한 탭을 연다.
 *
 * deprecated 세그먼트(persons, heads-of-state)는 별도 loader-only 라우트로 redirect —
 * 컴포넌트 마운트 후 useEffect redirect 대신 즉시 갈아탄다.
 */
const countryDetailChildSegments = [
  'dashboard',
  'historical',
  'regions',
  'government',
  'elections',
  'elections/party/:partyId',
  'laws',
  'ethnicity',
  'treaty',
] as const

/**
 * `/country/:id/persons` → `/persons-timeline/?countries=<id>` redirect.
 * `?tab=heads` (역대 수반 탭이 행정조직으로 통합되기 전 잔존 링크) 인 경우만
 * `/country/:id/government`로 갈아탄다.
 */
const personsRedirectLoader = ({ params, request }: LoaderFunctionArgs) => {
  const countryId = params.countryId
  if (!countryId) return redirect(pathKeys.country())
  const url = new URL(request.url)
  if (url.searchParams.get('tab') === 'heads') {
    return redirect(pathKeys.countryGovernment(countryId))
  }
  return redirect(
    `${pathKeys.personsTimeline()}?countries=${encodeURIComponent(countryId)}`,
  )
}

/** `/country/:id/heads-of-state` → `/country/:id/government` (역대 수반 탭이 행정조직 탭에 통합됨) */
const headsOfStateRedirectLoader = ({ params }: LoaderFunctionArgs) => {
  const countryId = params.countryId
  if (!countryId) return redirect(pathKeys.country())
  return redirect(pathKeys.countryGovernment(countryId))
}

const countryDetailChildren: RouteObject[] = [
  // /country (no ID) — EmptyState
  { index: true, lazy: lazyCountryDetailContent },
  // /country/:countryId — 기본 콘텐츠 (탭 미지정 → CountryDetail이 dashboard로 폴백)
  { path: ':countryId', lazy: lazyCountryDetailContent },
  // /country/:countryId/<segment> — detail 콘텐츠 (CountryDetail 위젯이 탭 매핑)
  ...countryDetailChildSegments.map((seg) => ({
    path: `:countryId/${seg}`,
    lazy: lazyCountryDetailContent,
  })),
  // /country/:countryId/events — 별도 콘텐츠 페이지
  { path: ':countryId/events', lazy: lazyCountryDetailEventsContent },
  // deprecated → loader-level redirect (컴포넌트 안 띄우고 즉시 갈아탐)
  { path: ':countryId/persons', loader: personsRedirectLoader },
  { path: ':countryId/heads-of-state', loader: headsOfStateRedirectLoader },
]

export const countryRoute: RouteObject = {
  path: 'country',
  lazy: lazyCountryDetailShell,
  children: countryDetailChildren,
}
