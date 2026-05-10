/**
 * 🗺️ 애플리케이션 라우트 경로 상수
 *
 * 하나의 루트 객체에서 모든 라우트 경로를 관리합니다.
 * 새로운 페이지 추가 시 이 객체에 섹션을 추가하면 됩니다.
 */
export const ROUTES = {
  // Root & Auth
  ROOT: '/',
  LOGIN: 'login',
  REGISTER: 'register',

  // Main Pages
  DASHBOARD: 'dashboard',
  SETTINGS: 'settings',
  SERVICES: 'services',

  // History
  HISTORY: {
    ROOT: 'history',
    COUNTRY: 'country',
    CONTINENTS: 'continents',
    EVENTS: 'events',
    HISTORICAL_COUNTRY: 'historical-country',
    PERSONS: 'persons',
    DYNASTIES: 'dynasties',
    JOBS: 'jobs',
    MILITARY_UNITS: 'military-units',
    /** 연대표/대시보드 공통 세그먼트 (인물·연대표 등) */
    DASHBOARD: 'dashboard',
    /** 역대 수장 통합 비교 — 현대·역사 국가 모두 한 화면에서 비교 */
    HEADS_OF_STATE: 'heads-of-state',
  },

  // Genealogy (standalone full-screen)
  GENEALOGY: 'genealogy',

  // Error Pages
  PAGE_404: '404',
} as const

// 하위 호환성을 위한 별칭 (필요시 사용)
export const HISTORY_PATHS = ROUTES.HISTORY
