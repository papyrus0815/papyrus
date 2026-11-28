import type { NavigateFunction } from 'react-router-dom'

import { ROUTES } from '@/shared/constants/routes'

/**
 * 🗺️ 애플리케이션 전체 경로를 관리하는 객체.
 *
 * 모든 경로를 함수 형태로 통일하여 일관성 있게 사용함.
 * 상수는 ROUTES에서 가져와 DRY 원칙 준수.
 * e.g. pathKeys.login(), pathKeys.article.bySlug('foo')
 */
export const pathKeys = {
  // --- Static Routes ---
  root: () => ROUTES.ROOT,
  home: () => ROUTES.ROOT,
  login: () => `/${ROUTES.LOGIN}/`,
  register: () => `/${ROUTES.REGISTER}/`,
  settings: () => `/${ROUTES.SETTINGS}/`,
  services: () => `/${ROUTES.SERVICES}/`,
  page404: () => `/${ROUTES.PAGE_404}/`,
  /** 가문 풀 페이지 */
  dynasty: () => `/dynasty`,
  /** 게이미피케이션 리더보드 */
  leaderboard: () => `/${ROUTES.LEADERBOARD}/`,
  /** 파피 상점 (지갑·구매) */
  shop: () => '/shop/',
  /** 유물관 (수집·진열) */
  collection: () => '/collection/',
  /** 공개 프로필(타 사용자) */
  publicProfile: (accountId: string) =>
    `/${ROUTES.PROFILE}/${encodeURIComponent(accountId)}`,

  /** 인물 묶음(세대·계파·사단) 허브 목록 */
  personGroups: (params?: {
    type?: string
    countryId?: string
    historicalCountryId?: string
  }) => {
    const qs = new URLSearchParams()
    if (params?.type) qs.set('type', params.type)
    if (params?.countryId) qs.set('countryId', params.countryId)
    if (params?.historicalCountryId)
      qs.set('historicalCountryId', params.historicalCountryId)
    const queryString = qs.toString()
    return `/${ROUTES.PERSON_GROUPS}/${queryString ? `?${queryString}` : ''}`
  },
  /** 인물 묶음 상세 */
  personGroupDetail: (groupId: string) =>
    `/${ROUTES.PERSON_GROUPS}/${encodeURIComponent(groupId)}/`,

  /** 조약 카탈로그 — 국가에 매이지 않은 조약 전역 목록·상세 */
  treaties: {
    list: () => `/${ROUTES.TREATIES}/`,
    detail: (treatyId: string) =>
      `/${ROUTES.TREATIES}/${encodeURIComponent(treatyId)}`,
  },

  /** 전 국가 정부·내각 카탈로그 — 모든 국가의 행정부·내각 및 중앙부처 통합 탐색·상세 */
  government: {
    list: (params?: {
      tab?: 'cabinets' | 'departments'
      polity?: string
      year?: number
      query?: string
      categoryId?: string
      current?: boolean
      linked?: boolean
    }) => {
      const qs = new URLSearchParams()
      if (params?.tab && params.tab !== 'cabinets') qs.set('tab', params.tab)
      if (params?.polity?.trim()) qs.set('polity', params.polity.trim())
      if (params?.year != null && Number.isFinite(params.year)) {
        qs.set('year', String(Math.trunc(params.year)))
      }
      if (params?.query?.trim()) qs.set('q', params.query.trim())
      if (params?.categoryId) qs.set('categoryId', params.categoryId)
      if (params?.current) qs.set('current', '1')
      if (params?.linked) qs.set('linked', '1')
      const queryString = qs.toString()
      return `/${ROUTES.GOVERNMENT}/${queryString ? `?${queryString}` : ''}`
    },
    cabinetDetail: (cabinetId: string) =>
      `/${ROUTES.GOVERNMENT}/cabinets/${encodeURIComponent(cabinetId)}`,
    departmentDetail: (departmentId: string) =>
      `/${ROUTES.GOVERNMENT}/departments/${encodeURIComponent(departmentId)}`,
    positions: (params?: {
      id?: string
      catalog?: 'positions' | 'ranks'
      type?: string
      scope?: 'all' | 'universal' | 'polity' | 'institution' | 'unnormalized'
      polity?: string
      q?: string
    }) => {
      const qs = new URLSearchParams()
      if (params?.catalog && params.catalog !== 'positions') {
        qs.set('catalog', params.catalog)
      }
      if (params?.id) qs.set('id', params.id)
      if (params?.type) qs.set('type', params.type)
      if (params?.scope && params.scope !== 'all') qs.set('scope', params.scope)
      if (params?.polity?.trim()) qs.set('polity', params.polity.trim())
      if (params?.q?.trim()) qs.set('q', params.q.trim())
      const queryString = qs.toString()
      return `/${ROUTES.GOVERNMENT}/positions${queryString ? `?${queryString}` : ''}`
    },
  },

  /** 전 국가 정당 편람 — 모든 현대·역사 국가 정당 통합 탐색·계보·관련 사건 */
  politicalParties: {
    list: (params?: {
      id?: string
      countryId?: string
      historicalCountryId?: string
      position?: string
      q?: string
    }) => {
      const qs = new URLSearchParams()
      if (params?.id) qs.set('id', params.id)
      if (params?.countryId) qs.set('countryId', params.countryId)
      if (params?.historicalCountryId) {
        qs.set('historicalCountryId', params.historicalCountryId)
      }
      if (params?.position) qs.set('position', params.position)
      if (params?.q?.trim()) qs.set('q', params.q.trim())
      const queryString = qs.toString()
      return `/${ROUTES.POLITICAL_PARTIES}${queryString ? `?${queryString}` : ''}`
    },
    detail: (partyId: string) =>
      `/${ROUTES.POLITICAL_PARTIES}?id=${encodeURIComponent(partyId)}`,
  },

  /** 출처 서고 — sourceId를 주면 그 출처를 펼친 채로 */
  sources: (sourceId?: string) =>
    `/${ROUTES.SOURCES}/${sourceId ? `?id=${encodeURIComponent(sourceId)}` : ''}`,

  // --- Country (구 /history/country/*) ---
  country: () => `/${ROUTES.COUNTRY}/`,
  /** 국가 상세 고유 URL (경로 기반) */
  countryDetail: (countryId: string) =>
    `/${ROUTES.COUNTRY}/${encodeURIComponent(countryId)}/`,
  /** 국가 상세 대시보드 탭 고유 URL */
  countryDashboard: (countryId: string) =>
    `/${ROUTES.COUNTRY}/${encodeURIComponent(countryId)}/dashboard`,
  /** 국가 상세 내 역대 수반 탭 고유 URL (인물 하위 뷰, 하위 호환용) */
  countryHeadsOfState: (countryId: string) =>
    `/${ROUTES.COUNTRY}/${encodeURIComponent(countryId)}/heads-of-state`,
  /**
   * 국가 상세 내 인물 탭 고유 URL.
   * 하위 뷰: tab=stats(통계·최근 인물) | list(인물 리스트) | heads(역대 수반). 생략 시 stats.
   */
  countryPersons: (countryId: string) =>
    `/${ROUTES.COUNTRY}/${encodeURIComponent(countryId)}/persons`,
  /** 국가 상세 내 연결된 역사적 국가 탭 고유 URL */
  countryHistorical: (countryId: string) =>
    `/${ROUTES.COUNTRY}/${encodeURIComponent(countryId)}/historical`,
  /** 국가 상세 내 행정구역(지도·지역) 탭 고유 URL */
  countryRegions: (countryId: string) =>
    `/${ROUTES.COUNTRY}/${encodeURIComponent(countryId)}/regions`,
  /** 국가 상세 내 정부·행정 탭 고유 URL */
  countryGovernment: (countryId: string) =>
    `/${ROUTES.COUNTRY}/${encodeURIComponent(countryId)}/government`,
  /** 국가 상세 내 군사 탭 고유 URL */
  countryMilitary: (countryId: string, unitId?: string | null) =>
    `/${ROUTES.COUNTRY}/${encodeURIComponent(countryId)}/military${
      unitId ? `?unitId=${encodeURIComponent(unitId)}` : ''
    }`,
  /** 국가 상세 → 행정조직 → '정체' 서브탭 고유 URL */
  countryPoliticalSystem: (countryId: string) =>
    `/${ROUTES.COUNTRY}/${encodeURIComponent(countryId)}/government/system`,
  /** 국가 상세 내 선거·투표 탭 고유 URL */
  countryElections: (countryId: string) =>
    `/${ROUTES.COUNTRY}/${encodeURIComponent(countryId)}/elections`,
  /** 국가 상세 내 법령 탭 고유 URL */
  countryLaws: (countryId: string) =>
    `/${ROUTES.COUNTRY}/${encodeURIComponent(countryId)}/laws`,
  /** 국가 상세 내 민족 탭 고유 URL */
  countryEthnicity: (countryId: string) =>
    `/${ROUTES.COUNTRY}/${encodeURIComponent(countryId)}/ethnicity`,
  /** 국가 상세 내 조약 탭 고유 URL */
  countryTreaty: (countryId: string) =>
    `/${ROUTES.COUNTRY}/${encodeURIComponent(countryId)}/treaty`,
  /** 국가 상세 내 교역 탭 고유 URL */
  countryTrade: (countryId: string) =>
    `/${ROUTES.COUNTRY}/${encodeURIComponent(countryId)}/trade`,
  /** 국가 상세 내 기업 탭 고유 URL */
  countryCompanies: (countryId: string) =>
    `/${ROUTES.COUNTRY}/${encodeURIComponent(countryId)}/companies`,
  /** 국가 상세 내 경제·통계 탭 고유 URL */
  countryStatistics: (
    countryId: string,
    sub?: 'indicators' | 'pyramid' | 'bonds' | 'records',
  ) => {
    const base = `/${ROUTES.COUNTRY}/${encodeURIComponent(countryId)}/statistics`
    return sub ? `${base}?sub=${sub}` : base
  },
  /** 선거·투표 탭 내 정당 상세 (목록에서 정당 행 클릭) */
  countryElectionPartyDetail: (countryId: string, partyId: string) =>
    `/${ROUTES.COUNTRY}/${encodeURIComponent(countryId)}/elections/party/${encodeURIComponent(partyId)}`,
  /** 국가 상세 내 연대표(전체 사건) 탭 고유 URL. form=create 시 사건 등록 폼 표시 */
  /**
   * 국가 사건 탭. `century`는 **부호 세기**(20 = 20세기, -1 = 기원전 1세기) —
   * 대시보드 연표 막대에서 그 세기로 곧장 내려가기 위해 싣는다.
   */
  countryEvents: (
    countryId: string,
    form?: 'create',
    century?: number | null,
    domain?: string | null,
  ) => {
    const base = `/${ROUTES.COUNTRY}/${encodeURIComponent(countryId)}/events`
    if (form === 'create') return `${base}?form=create`
    const qs = new URLSearchParams()
    if (century != null && Number.isFinite(century)) {
      qs.set('century', String(century))
    }
    if (domain && domain.trim()) {
      qs.set('domain', domain.trim())
    }
    const query = qs.toString()
    return query ? `${base}?${query}` : base
  },

  // --- Timeline 뷰 (ContentShell 셸 — 구 /history/dashboard/*) ---
  /** 인물 타임라인 (국가 미선택 시 전체 인물) */
  personsTimeline: () => `/${ROUTES.PERSONS_TIMELINE}/`,
  /** 인물 타임라인 — 인물 상세 (사이드바 유지) */
  personsTimelineDetail: (personId: string) =>
    `/${ROUTES.PERSONS_TIMELINE}/${encodeURIComponent(personId)}/`,
  /** 인물 등록 — 풀 페이지 폼 (ContentLayout 셸 없음) */
  personsTimelineCreate: () => `/${ROUTES.PERSONS_TIMELINE}/create/`,
  /** 인물 수정 — 풀 페이지 폼 (ContentLayout 셸 없음) */
  personsTimelineEdit: (personId: string) =>
    `/${ROUTES.PERSONS_TIMELINE}/${encodeURIComponent(personId)}/edit/`,
  /**
   * 인물 타임라인 — 기록 비교 뷰 딥링크.
   * URL 계약: ?view=records&recordPersonIds=a,b,c(&fromYear=1501&toYear=1601)
   * (부호 연도, fromYear 포함 / toYear 배타)
   */
  personsTimelineRecords: (
    personIds: string[],
    range?: { fromYear: number; toYear: number },
  ) =>
    `/${ROUTES.PERSONS_TIMELINE}/?view=records&recordPersonIds=${personIds
      .map(encodeURIComponent)
      .join(',')}${
      range ? `&fromYear=${range.fromYear}&toYear=${range.toYear}` : ''
    }`,
  /** 민족 타임라인 */
  ethnicityTimeline: () => `/${ROUTES.ETHNICITY}/`,
  /** 민족 마스터 카탈로그 (CRUD) */
  ethnicities: () => `/${ROUTES.ETHNICITIES}`,
  /** 저원(입법) 타임라인 */
  legislatureTimeline: () => `/${ROUTES.LEGISLATURE}/`,
  /** 군사 카탈로그 총람 */
  military: () => `/${ROUTES.MILITARY}/`,
  militaryTimeline: () => `/${ROUTES.MILITARY}/`,
  /** 군사 부대 상세 고유 URL */
  militaryUnitDetail: (unitId: string) =>
    `/${ROUTES.MILITARY}/units/${encodeURIComponent(unitId)}`,

  // --- 대륙·수장 ---
  continents: () => `/${ROUTES.CONTINENTS}/`,
  /**
   * 역대 수장 통합 비교 페이지 — 현대·역사 국가 모두 한 화면에서 비교.
   * `year` 쿼리는 동시대 가이드라인을 그 시점에 자동으로 꽂는다 (사건·인물 상세 진입용).
   *
   * URL 계약(목적지 파서: use-heads-of-state-timeline-state.ts):
   *  - `?range=START-END` — 시간축 초기 범위, endYear > startYear 필수(아니면 무시)
   *  - `?pins=C:<countryId>,H:<historicalCountryId>` — 초기 핀 국가(콤마=행)
   *    보드가 비어있으면 교체, 이미 핀이 있으면 dedup 병합-추가된다.
   */
  headsOfState: (
    year?: number,
    opts?: {
      range?: { startYear: number; endYear: number }
      pins?: Array<{ kind: 'C' | 'H'; id: string }>
    },
  ) => {
    const params = new URLSearchParams()
    if (year != null) params.set('year', String(year))
    if (opts?.range) {
      // 음수(BC) 연도가 끼면 '-' 구분자가 모호해지므로 '~' 사용 (파서는 [-_~] 모두 수용)
      const separator =
        opts.range.startYear < 0 || opts.range.endYear < 0 ? '~' : '-'
      params.set(
        'range',
        `${opts.range.startYear}${separator}${opts.range.endYear}`,
      )
    }
    if (opts?.pins && opts.pins.length > 0) {
      params.set('pins', opts.pins.map((pin) => `${pin.kind}:${pin.id}`).join(','))
    }
    const query = params.toString()
    return query
      ? `/${ROUTES.HEADS_OF_STATE}/?${query}`
      : `/${ROUTES.HEADS_OF_STATE}/`
  },
  /** 수장 지도 아틀라스 — 연도별 군주 핀 + 전쟁·동맹 선. 연표와 `?year=`를 공유한다 */
  headsOfStateAtlas: (year?: number | null) =>
    year != null
      ? `/${ROUTES.HEADS_OF_STATE}/atlas/?year=${year}`
      : `/${ROUTES.HEADS_OF_STATE}/atlas/`,

  // --- Events Routes ---
  events: {
    root: () => `/${ROUTES.EVENTS}/`,
    create: () => `/${ROUTES.EVENTS}/create/`,
    /**
     * @deprecated 수정은 상세 인라인 편집으로 흡수됐다. 이 경로는 외부 링크·북마크가
     * 404가 되지 않도록 상세로 redirect만 한다(`pages/events/event-route.ts`).
     * 앱 안에서는 `detail()`을 쓸 것 — 호출처 0개.
     */
    edit: (eventId: string) => `/${ROUTES.EVENTS}/${eventId}/edit/`,
    detail: (eventId: string) => `/${ROUTES.EVENTS}/${eventId}/`,
  },

  // --- Companies Routes ---
  companies: {
    root: () => '/companies/',
    detail: (companyId: string) => `/companies/${companyId}/`,
  },

  // --- Genealogy ---
  genealogy: {
    full: (personId: string) => `/${ROUTES.GENEALOGY}/${encodeURIComponent(personId)}/`,
  },

  // --- Dynamic Routes ---
  article: {
    root: () => '/article/',
    bySlug: (slug: string) => `/article/${slug}/`,
  },

  profile: {
    root: () => '/profile/',
    byUsername: (username: string) => `/profile/${username}/`,
    byUsernameFavorites: (username: string) =>
      `/profile/${username}/favorites/`,
  },

  editor: {
    root: () => '/editor/',
    bySlug: (slug: string) => `/editor/${slug}/`,
  },
} as const

/**
 * 폼 페이지가 "이전"·저장 취소 시 돌아갈 목적지를 담는 라우트 state.
 *
 * 목록에서 폼으로 들어갔다 나올 때 URL에 동기화된 필터·정렬·뷰모드·선택이 날아가지 않게
 * 진입점이 현재 URL을 그대로 넘겨준다. state가 없으면 폼은 자기 도메인 루트로 돌아간다.
 */
export interface ReturnToState {
  from?: string
}

/**
 * `navigate(to, returnTo(location))` 형태로 쓰는 헬퍼.
 * state 키 이름이 진입점마다 흩어지지 않게 한 곳에서 만든다.
 */
export const returnTo = (location: {
  pathname: string
  search?: string
}): { state: ReturnToState } => ({
  state: { from: `${location.pathname}${location.search ?? ''}` },
})

/**
 * '뒤로'·'목록 보기'처럼 되돌아감을 약속하는 컨트롤의 공통 동작.
 *
 * 지면 하나로 고정 이동시키면 대시보드 밖(가계도·기업·국가 상세 등)에서 들어온 사용자의
 * 진입 맥락이 사라지고 히스토리 항목만 하나 늘어난다. 반대로 `navigate(-1)`만 쓰면 새 탭
 * 딥링크(돌아갈 항목 없음)에서 무동작이 된다 — 둘을 한 곳에서 갈라준다.
 */
export const goBackOr = (navigate: NavigateFunction, fallback: string) => {
  if (window.history.length > 1) navigate(-1)
  else navigate(fallback, { replace: true })
}
