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

  // --- History Routes ---
  history: {
    root: () => `/${ROUTES.HISTORY.ROOT}/`,
    country: () => `/${ROUTES.HISTORY.ROOT}/${ROUTES.HISTORY.COUNTRY}/`,
    /** 국가 상세 고유 URL (경로 기반) */
    countryDetail: (countryId: string) =>
      `/${ROUTES.HISTORY.ROOT}/${ROUTES.HISTORY.COUNTRY}/${encodeURIComponent(countryId)}/`,
    /** 국가 상세 대시보드 탭 고유 URL */
    countryDashboard: (countryId: string) =>
      `/${ROUTES.HISTORY.ROOT}/${ROUTES.HISTORY.COUNTRY}/${encodeURIComponent(countryId)}/dashboard`,
    /** 국가 상세 내 역대 수반 탭 고유 URL (인물 하위 뷰, 하위 호환용) */
    countryHeadsOfState: (countryId: string) =>
      `/${ROUTES.HISTORY.ROOT}/${ROUTES.HISTORY.COUNTRY}/${encodeURIComponent(countryId)}/heads-of-state`,
    /**
     * 국가 상세 내 인물 탭 고유 URL.
     * 하위 뷰: tab=stats(통계·최근 인물) | list(인물 리스트) | heads(역대 수반). 생략 시 stats.
     */
    countryPersons: (countryId: string, tab?: 'stats' | 'list' | 'heads') =>
      tab
        ? `/${ROUTES.HISTORY.ROOT}/${ROUTES.HISTORY.COUNTRY}/${encodeURIComponent(countryId)}/persons?tab=${tab}`
        : `/${ROUTES.HISTORY.ROOT}/${ROUTES.HISTORY.COUNTRY}/${encodeURIComponent(countryId)}/persons`,
    /** 국가 상세 내 연결된 역사적 국가 탭 고유 URL */
    countryHistorical: (countryId: string) =>
      `/${ROUTES.HISTORY.ROOT}/${ROUTES.HISTORY.COUNTRY}/${encodeURIComponent(countryId)}/historical`,
    /** 국가 상세 내 행정구역(지도·지역) 탭 고유 URL */
    countryRegions: (countryId: string) =>
      `/${ROUTES.HISTORY.ROOT}/${ROUTES.HISTORY.COUNTRY}/${encodeURIComponent(countryId)}/regions`,
    /** 국가 상세 내 행정조직 탭 고유 URL */
    countryGovernment: (countryId: string) =>
      `/${ROUTES.HISTORY.ROOT}/${ROUTES.HISTORY.COUNTRY}/${encodeURIComponent(countryId)}/government`,
    continents: () => `/${ROUTES.HISTORY.ROOT}/${ROUTES.HISTORY.CONTINENTS}/`,
  },

  // --- Events Routes ---
  events: {
    root: () => `/${ROUTES.HISTORY.EVENTS}/`,
    create: () => `/${ROUTES.HISTORY.EVENTS}/create/`,
    edit: (eventId: string) => `/${ROUTES.HISTORY.EVENTS}/${eventId}/edit/`,
    detail: (eventId: string) => `/${ROUTES.HISTORY.EVENTS}/${eventId}/`,
  },

  // --- Persons Routes ---
  persons: {
    root: () => '/persons/',
    create: () => '/persons/create/',
    edit: (personId: string) => `/persons/${personId}/edit/`,
    detail: (personId: string) => `/persons/${personId}/`,
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
