/**
 * 🗺️ 애플리케이션 라우트 경로 상수
 *
 * 하나의 루트 객체에서 모든 라우트 경로를 관리합니다.
 * 새로운 페이지 추가 시 이 객체에 항목을 추가하면 됩니다.
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

  // History 콘텐츠 (전부 top-level로 평탄화)
  COUNTRY: 'country',
  CONTINENTS: 'continents',
  HEADS_OF_STATE: 'heads-of-state',
  PERSONS_TIMELINE: 'persons-timeline',
  ETHNICITY: 'ethnicity',
  LEGISLATURE: 'legislature',
  MILITARY: 'military',
  EVENTS: 'events',

  // Genealogy (standalone full-screen)
  GENEALOGY: 'genealogy',

  // 인물 묶음 (세대·계파·사단 등) 허브
  PERSON_GROUPS: 'person-groups',

  // 게이미피케이션 리더보드
  LEADERBOARD: 'leaderboard',

  // 내 프로필 (계정 정보·등급·뱃지)
  PROFILE: 'profile',

  // Error Pages
  PAGE_404: '404',
} as const

/**
 * 구 `/history/*` 자손이었던 콘텐츠 영역 top-level 프리픽스.
 * ContentSkeleton 노출·콘텐츠 영역 판별 등 공통 조건에서 사용.
 * 새 top-level 콘텐츠 라우트 추가 시 여기만 갱신하면 됨.
 */
export const CONTENT_AREA_PREFIXES = [
  `/${ROUTES.COUNTRY}`,
  `/${ROUTES.CONTINENTS}`,
  `/${ROUTES.HEADS_OF_STATE}`,
  `/${ROUTES.PERSONS_TIMELINE}`,
  `/${ROUTES.ETHNICITY}`,
  `/${ROUTES.LEGISLATURE}`,
  `/${ROUTES.MILITARY}`,
] as const
