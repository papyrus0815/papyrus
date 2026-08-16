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

/**
 * 콘텐츠 영역 프리픽스를 쓰지만 ContentLayout 셸(사이드바·3분할) 없이 자체 풀페이지를
 * 그리는 예외 — 인물 등록/수정 폼. URL은 `/persons-timeline/*`이지만 화면은 단일 컬럼
 * 폼이라, 프리픽스만 보고 콘텐츠 영역으로 판정하면 로딩 스켈레톤이 실제 화면과 어긋난다.
 */
const CONTENT_AREA_EXCEPTIONS = [
  new RegExp(`^/${ROUTES.PERSONS_TIMELINE}/create/?$`),
  new RegExp(`^/${ROUTES.PERSONS_TIMELINE}/[^/]+/edit/?$`),
] as const

/**
 * 이 pathname이 ContentLayout 셸을 쓰는 콘텐츠 영역인지.
 * 프리픽스 판정 + 위 예외를 한 곳에서 처리 — 호출부가 `.some(startsWith)`를 각자 펼치면
 * 예외가 한쪽에만 반영되는 드리프트가 난다.
 */
export function isContentAreaPath(pathname: string): boolean {
  if (CONTENT_AREA_EXCEPTIONS.some((pattern) => pattern.test(pathname))) {
    return false
  }
  return CONTENT_AREA_PREFIXES.some((prefix) => pathname.startsWith(prefix))
}
