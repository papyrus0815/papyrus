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
    continents: () => `/${ROUTES.HISTORY.ROOT}/${ROUTES.HISTORY.CONTINENTS}/`,
  },

  // --- Events Routes ---
  events: {
    root: () => `/${ROUTES.HISTORY.EVENTS}/`,
    create: () => `/${ROUTES.HISTORY.EVENTS}/create/`,
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
