import {
  redirect,
  replace,
  type LoaderFunctionArgs,
  type RouteObject,
} from 'react-router-dom'

import { pathKeys } from '@/shared/router'

/**
 * 🗺️ 구 `/history/*` 북마크 흡수용 redirect 라우트 묶음.
 *
 * URL 구조 평탄화 마이그레이션 (history 프리픽스 제거) 직후 외부에 노출된 링크가
 * 깨지지 않도록 신 경로로 308 redirect한다. 정착되면 별도 PR로 통째 제거 가능.
 */

/** `/history/country/{rest}` → `/country/{rest}` (트레일링 path·query 보존) */
const countryWildcardRedirect = ({ params, request }: LoaderFunctionArgs) => {
  const rest = params['*'] ?? ''
  const search = new URL(request.url).search
  return redirect(`/country${rest ? `/${rest}` : '/'}${search}`)
}

/** `/history/dashboard/persons/:personId` → `/persons-timeline/:personId/` */
const personsTimelineDetailRedirect = ({ params }: LoaderFunctionArgs) => {
  const personId = params.personId ?? ''
  return redirect(pathKeys.personsTimelineDetail(personId))
}

/** `/history/events[?query]` → `/events/[?query]` (북마크·외부 링크 흡수) */
const eventsRedirect = ({ request }: LoaderFunctionArgs) => {
  const search = new URL(request.url).search
  return redirect(`${pathKeys.events.root()}${search}`)
}

export const legacyHistoryRedirectRoute: RouteObject = {
  path: 'history',
  children: [
    { index: true, loader: () => redirect(pathKeys.country()) },
    { path: 'country/*', loader: countryWildcardRedirect },
    { path: 'continents', loader: () => redirect(pathKeys.continents()) },
    { path: 'heads-of-state', loader: () => redirect(pathKeys.headsOfState()) },
    { path: 'events', loader: eventsRedirect },
    { path: 'dashboard/persons', loader: () => redirect(pathKeys.personsTimeline()) },
    { path: 'dashboard/persons/:personId', loader: personsTimelineDetailRedirect },
    { path: 'dashboard/ethnicity', loader: () => redirect(pathKeys.ethnicityTimeline()) },
    { path: 'dashboard/legislature', loader: () => redirect(pathKeys.legislatureTimeline()) },
    { path: 'dashboard/military', loader: () => redirect(pathKeys.militaryTimeline()) },
    { path: 'dashboard/dynasty', loader: () => redirect('/dynasty') },
    { path: 'dynasties', loader: () => redirect('/dynasty') },
    { path: 'dynasties/:dynastyId', loader: () => redirect('/dynasty') },
  ],
}

/** `/dynasties/*` → `/dynasty` redirect (구 URL 흡수) */
export const legacyDynastyRedirectRoutes: RouteObject[] = [
  { path: 'dynasties', loader: () => redirect('/dynasty') },
  { path: 'dynasties/:dynastyId', loader: () => redirect('/dynasty') },
]

/** `/persons/:personId` → `/persons-timeline/:personId/` (query 보존 — `?tab=` 딥링크) */
const personsDetailRedirect = ({ params, request }: LoaderFunctionArgs) => {
  const search = new URL(request.url).search
  return replace(
    `${pathKeys.personsTimelineDetail(params.personId ?? '')}${search}`,
  )
}

/**
 * 구 `/persons/*` 단독 라우트 흡수 — 인물 지면을 `/persons-timeline`으로 통합하면서
 * 북마크·외부 링크가 404가 되지 않도록 redirect만 남긴다.
 *
 * `redirect()`가 아니라 `replace()`인 이유: `redirect()`는 히스토리 PUSH라 구 URL이
 * 스택에 살아남는다. 뒤로가기를 누르면 그 항목의 loader가 다시 돌아 앞으로 밀어내므로
 * 참조 페이지로 영영 못 돌아간다(react-router 7 기준). `replace()`는 구 항목을 덮어써
 * 뒤로가기가 원래 출발지로 간다. `/persons/:id`·`create`·`:id/edit`는 이번 통합 전까지
 * 실제 페이지였으므로, PUSH로 두면 있던 뒤로가기를 망가뜨리는 회귀가 된다.
 */
export const legacyPersonsRedirectRoutes: RouteObject[] = [
  { path: 'persons', loader: () => replace(pathKeys.personsTimeline()) },
  {
    path: 'persons/create',
    loader: () => replace(pathKeys.personsTimelineCreate()),
  },
  { path: 'persons/:personId', loader: personsDetailRedirect },
  {
    path: 'persons/:personId/edit',
    loader: ({ params }: LoaderFunctionArgs) =>
      replace(pathKeys.personsTimelineEdit(params.personId ?? '')),
  },
]
