/**
 * /history/* 경로의 URL을 단일 구조체로 파싱한다.
 *
 * 기존 `country.page.tsx`가 15개 정규식을 펼쳐놓고 있던 것을 한 곳에 모음.
 * - URL이 진실의 원천(source of truth). state 중복 금지.
 * - 새 대시보드 뷰 추가 시 `DASHBOARD_VIEW_PATTERNS`만 업데이트하면 됨.
 */
import { useMemo } from 'react'

import { useLocation, useParams, useSearchParams } from 'react-router-dom'

import type { DashboardContentView } from '@/widgets/history-shell/model/dashboard-menu-items'

/** 현재 페이지의 최상위 모드 */
export type HistoryViewMode =
  /** /history/country (풀스크린 국가 탐색) */
  | 'country-browse'
  /** /history/country/:id/* (국가 상세) */
  | 'country-detail'
  /** /history/dashboard/* (대시보드 — 인물·통계·행정부 등) */
  | 'dashboard'
  /** 그 외 (/history 인덱스, 대륙, 포스트 등) */
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
  | null

interface HistoryLocation {
  /** 최상위 모드 */
  mode: HistoryViewMode
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
  /** /history 영역 내부인지 (헤더 공통) */
  inHistory: boolean
  /** 현재 pathname (재파싱용) */
  pathname: string
}

/** 대시보드 뷰별 URL 매칭 패턴 — matchPath 순서대로 첫 매치를 사용 */
const DASHBOARD_VIEW_PATTERNS: Array<{
  view: DashboardContentView
  match: RegExp
}> = [
  { view: 'person', match: /^\/history\/dashboard\/persons(\/[^/]+)?\/?$/ },
  { view: 'administration', match: /^\/history\/dashboard\/administration\/?$/ },
  { view: 'dynasty', match: /^\/history\/dashboard\/dynasty\/?$/ },
  { view: 'ethnicity', match: /^\/history\/dashboard\/ethnicity\/?$/ },
  { view: 'legislature', match: /^\/history\/dashboard\/legislature\/?$/ },
  { view: 'military', match: /^\/history\/dashboard\/military\/?$/ },
]

/** 국가 상세 내부 탭 URL 매칭 */
const DETAIL_TAB_PATTERNS: Array<{
  tab: Exclude<CountryDetailTab, null>
  match: RegExp
}> = [
  { tab: 'dashboard', match: /\/history\/country\/[^/]+\/dashboard\/?$/ },
  { tab: 'heads-of-state', match: /\/history\/country\/[^/]+\/heads-of-state\/?$/ },
  { tab: 'persons', match: /\/history\/country\/[^/]+\/persons\/?$/ },
  {
    tab: 'linked-historical',
    match: /\/history\/country\/[^/]+\/historical\/?$/,
  },
  { tab: 'regions', match: /\/history\/country\/[^/]+\/regions\/?$/ },
  { tab: 'government', match: /\/history\/country\/[^/]+\/government\/?$/ },
  {
    tab: 'elections',
    match: /\/history\/country\/[^/]+\/elections(\/party\/[^/?#]+)?\/?$/,
  },
  { tab: 'laws', match: /\/history\/country\/[^/]+\/laws\/?$/ },
  { tab: 'events', match: /\/history\/country\/[^/]+\/events\/?$/ },
]

export function useHistoryLocation(): HistoryLocation {
  const location = useLocation()
  const params = useParams<{
    countryId?: string
    personId?: string
    partyId?: string
  }>()
  const [searchParams] = useSearchParams()
  // searchParams 자체는 매 렌더마다 새 객체라서 의존성에서 제외 (pathname만 보면 됨)
  void searchParams

  return useMemo<HistoryLocation>(() => {
    const pathname = location.pathname
    const inHistory = pathname.startsWith('/history')

    // /history/country/:id 상세
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
        inHistory,
        pathname,
      }
    }

    // /history/country (정확히 browse)
    if (/^\/history\/country\/?$/.test(pathname)) {
      return {
        mode: 'country-browse',
        countryId: null,
        dashboardView: null,
        dashboardPersonId: null,
        detailTab: null,
        detailElectionPartyId: null,
        inHistory,
        pathname,
      }
    }

    // /history/dashboard/*
    if (pathname.startsWith('/history/dashboard')) {
      const found = DASHBOARD_VIEW_PATTERNS.find((p) => p.match.test(pathname))
      return {
        mode: 'dashboard',
        countryId: null,
        dashboardView: found?.view ?? null,
        dashboardPersonId: params.personId ?? null,
        detailTab: null,
        detailElectionPartyId: null,
        inHistory,
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
      inHistory,
      pathname,
    }
  }, [
    location.pathname,
    params.countryId,
    params.personId,
    params.partyId,
  ])
}
