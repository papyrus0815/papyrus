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
  countryPersons: (countryId: string, tab?: 'stats' | 'list' | 'heads') =>
    tab
      ? `/${ROUTES.COUNTRY}/${encodeURIComponent(countryId)}/persons?tab=${tab}`
      : `/${ROUTES.COUNTRY}/${encodeURIComponent(countryId)}/persons`,
  /** 국가 상세 내 연결된 역사적 국가 탭 고유 URL */
  countryHistorical: (countryId: string) =>
    `/${ROUTES.COUNTRY}/${encodeURIComponent(countryId)}/historical`,
  /** 국가 상세 내 행정구역(지도·지역) 탭 고유 URL */
  countryRegions: (countryId: string) =>
    `/${ROUTES.COUNTRY}/${encodeURIComponent(countryId)}/regions`,
  /** 국가 상세 내 행정조직 탭 고유 URL */
  countryGovernment: (countryId: string) =>
    `/${ROUTES.COUNTRY}/${encodeURIComponent(countryId)}/government`,
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
  /** 선거·투표 탭 내 정당 상세 (목록에서 정당 행 클릭) */
  countryElectionPartyDetail: (countryId: string, partyId: string) =>
    `/${ROUTES.COUNTRY}/${encodeURIComponent(countryId)}/elections/party/${encodeURIComponent(partyId)}`,
  /** 국가 상세 내 연대표(전체 사건) 탭 고유 URL. form=create 시 사건 등록 폼 표시 */
  countryEvents: (countryId: string, form?: 'create') =>
    form === 'create'
      ? `/${ROUTES.COUNTRY}/${encodeURIComponent(countryId)}/events?form=create`
      : `/${ROUTES.COUNTRY}/${encodeURIComponent(countryId)}/events`,

  // --- Timeline 뷰 (ContentShell 셸 — 구 /history/dashboard/*) ---
  /** 인물 타임라인 (국가 미선택 시 전체 인물) */
  personsTimeline: () => `/${ROUTES.PERSONS_TIMELINE}/`,
  /** 인물 타임라인 — 인물 상세 (사이드바 유지) */
  personsTimelineDetail: (personId: string) =>
    `/${ROUTES.PERSONS_TIMELINE}/${encodeURIComponent(personId)}/`,
  /** 민족 타임라인 */
  ethnicityTimeline: () => `/${ROUTES.ETHNICITY}/`,
  /** 저원(입법) 타임라인 */
  legislatureTimeline: () => `/${ROUTES.LEGISLATURE}/`,
  /** 군사 타임라인 */
  militaryTimeline: () => `/${ROUTES.MILITARY}/`,

  // --- 대륙·수장 ---
  continents: () => `/${ROUTES.CONTINENTS}/`,
  /**
   * 역대 수장 통합 비교 페이지 — 현대·역사 국가 모두 한 화면에서 비교.
   * `year` 쿼리는 동시대 가이드라인을 그 시점에 자동으로 꽂는다 (사건 상세 진입용).
   */
  headsOfState: (year?: number) =>
    year != null
      ? `/${ROUTES.HEADS_OF_STATE}/?year=${year}`
      : `/${ROUTES.HEADS_OF_STATE}/`,

  // --- Events Routes ---
  events: {
    root: () => `/${ROUTES.EVENTS}/`,
    create: () => `/${ROUTES.EVENTS}/create/`,
    edit: (eventId: string) => `/${ROUTES.EVENTS}/${eventId}/edit/`,
    detail: (eventId: string) => `/${ROUTES.EVENTS}/${eventId}/`,
  },

  // --- Persons Routes ---
  persons: {
    root: () => '/persons/',
    create: () => '/persons/create/',
    edit: (personId: string) => `/persons/${personId}/edit/`,
    detail: (personId: string) => `/persons/${personId}/`,
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
