/**
 * 콘텐츠 영역(/country/*, /persons-timeline/*, /ethnicity, /legislature, /military, …)
 * URL을 단일 구조체로 파싱한다.
 *
 * 기존 `country.page.tsx`가 15개 정규식을 펼쳐놓고 있던 것을 한 곳에 모음.
 * - URL이 진실의 원천(source of truth). state 중복 금지.
 * - 새 대시보드 뷰 추가 시 `DASHBOARD_VIEW_PATTERNS`만 업데이트하면 됨.
 */
import { useMemo } from 'react'

import { useLocation, useParams, useSearchParams } from 'react-router-dom'

import { CONTENT_AREA_PREFIXES } from '@/shared/constants/routes'
import type { DashboardContentView } from '@/widgets/content-shell/model/dashboard-menu-items'

/** 현재 페이지의 최상위 모드 */
export type ContentViewMode =
  /** /country (풀스크린 국가 탐색) */
  | 'country-browse'
  /** /country/:id/* (국가 상세) */
  | 'country-detail'
  /** /persons-timeline, /ethnicity, /legislature, /military (대시보드 뷰) */
  | 'dashboard'
  /** 그 외 (대륙, 수장 비교 등) */
  | 'other'

/** 국가 상세 내부의 세부 탭 */
export type CountryDetailTab =
  | 'dashboard'
  | 'heads-of-state'
  | 'persons'
  | 'linked-historical'
  | 'regions'
  | 'government'
  | 'elections'
  | 'laws'
  | 'events'
  | 'ethnicity'
  | 'treaty'
  | null

interface ContentLocation {
  /** 최상위 모드 */
  mode: ContentViewMode
  /** 경로 기반 URL의 countryId (country-detail 모드일 때) */
  countryId: string | null
  /** 대시보드 현재 뷰 (dashboard 모드일 때) */
  dashboardView: DashboardContentView | null
  /** 대시보드 인물 상세 URL의 personId */
  dashboardPersonId: string | null
  /** 국가 상세 내부 탭 (country-detail 모드일 때) */
  detailTab: CountryDetailTab
  /** 선거·투표 탭 내 정당 상세 partyId */
  detailElectionPartyId: string | null
  /** 콘텐츠 영역(/country, /persons-timeline 등) 내부인지 (헤더 공통) */
  inContentArea: boolean
  /** 현재 pathname (재파싱용) */
  pathname: string
}

/** 대시보드 뷰별 URL 매칭 패턴 — matchPath 순서대로 첫 매치를 사용 */
const DASHBOARD_VIEW_PATTERNS: Array<{
  view: DashboardContentView
  match: RegExp
}> = [
  { view: 'person', match: /^\/persons-timeline(\/[^/]+)?\/?$/ },
  { view: 'ethnicity', match: /^\/ethnicity\/?$/ },
  { view: 'legislature', match: /^\/legislature\/?$/ },
  { view: 'military', match: /^\/military\/?$/ },
]

/** 국가 상세 내부 탭 URL 매칭 */
const DETAIL_TAB_PATTERNS: Array<{
  tab: Exclude<CountryDetailTab, null>
  match: RegExp
}> = [
  { tab: 'dashboard', match: /^\/country\/[^/]+\/dashboard\/?$/ },
  { tab: 'heads-of-state', match: /^\/country\/[^/]+\/heads-of-state\/?$/ },
  { tab: 'persons', match: /^\/country\/[^/]+\/persons\/?$/ },
  {
    tab: 'linked-historical',
    match: /^\/country\/[^/]+\/historical\/?$/,
  },
  { tab: 'regions', match: /^\/country\/[^/]+\/regions\/?$/ },
  { tab: 'government', match: /^\/country\/[^/]+\/government\/?$/ },
  {
    tab: 'elections',
    match: /^\/country\/[^/]+\/elections(\/party\/[^/?#]+)?\/?$/,
  },
  { tab: 'laws', match: /^\/country\/[^/]+\/laws\/?$/ },
  { tab: 'events', match: /^\/country\/[^/]+\/events\/?$/ },
  { tab: 'ethnicity', match: /^\/country\/[^/]+\/ethnicity\/?$/ },
  { tab: 'treaty', match: /^\/country\/[^/]+\/treaty\/?$/ },
]

export function useContentLocation(): ContentLocation {
  const location = useLocation()
  const params = useParams<{
    countryId?: string
    personId?: string
    partyId?: string
  }>()
  const [searchParams] = useSearchParams()
  // searchParams 자체는 매 렌더마다 새 객체라서 의존성에서 제외 (pathname만 보면 됨)
  void searchParams

  return useMemo<ContentLocation>(() => {
    const pathname = location.pathname
    const inContentArea = CONTENT_AREA_PREFIXES.some((p) =>
      pathname.startsWith(p),
    )

    // /country/:id 상세
    if (params.countryId) {
      const detailTab =
        DETAIL_TAB_PATTERNS.find((p) => p.match.test(pathname))?.tab ?? null
      return {
        mode: 'country-detail',
        countryId: params.countryId,
        dashboardView: null,
        dashboardPersonId: null,
        detailTab,
        detailElectionPartyId: params.partyId ?? null,
        inContentArea,
        pathname,
      }
    }

    // /country (정확히 browse)
    if (/^\/country\/?$/.test(pathname)) {
      return {
        mode: 'country-browse',
        countryId: null,
        dashboardView: null,
        dashboardPersonId: null,
        detailTab: null,
        detailElectionPartyId: null,
        inContentArea,
        pathname,
      }
    }

    // /persons-timeline, /ethnicity, /legislature, /military
    const dashboardMatch = DASHBOARD_VIEW_PATTERNS.find((p) =>
      p.match.test(pathname),
    )
    if (dashboardMatch) {
      return {
        mode: 'dashboard',
        countryId: null,
        dashboardView: dashboardMatch.view,
        dashboardPersonId: params.personId ?? null,
        detailTab: null,
        detailElectionPartyId: null,
        inContentArea,
        pathname,
      }
    }

    return {
      mode: 'other',
      countryId: null,
      dashboardView: null,
      dashboardPersonId: null,
      detailTab: null,
      detailElectionPartyId: null,
      inContentArea,
      pathname,
    }
  }, [
    location.pathname,
    params.countryId,
    params.personId,
    params.partyId,
  ])
}
