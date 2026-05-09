import type { useRouter } from 'expo-router'

export type Router = ReturnType<typeof useRouter>

export const routes = {
  person: (id: string) => `/person/${id}`,
  personEdit: (id?: string | null) =>
    id ? `/person/edit?id=${id}` : '/person/edit',
  event: (id: string) => `/event/${id}`,
  eventEdit: (id?: string | null) => (id ? `/event/edit?id=${id}` : '/event/edit'),
  country: (id: string) => `/country/${id}`,
  bookmarks: '/bookmarks',
  // 탭 라우트
  tabs: {
    home: '/(tabs)',
    persons: '/(tabs)/persons',
    countries: '/(tabs)/countries',
  },
  login: '/login',
} as const

/** Expo Router 타입 한계상 동적 경로 push에 캐스팅 1회 */
type Href = Parameters<Router['push']>[0]

export function pushRoute(router: Router, href: string) {
  router.push(href as Href)
}

export function replaceRoute(router: Router, href: string) {
  router.replace(href as Href)
}

export const goPerson = (router: Router, id: string) => pushRoute(router, routes.person(id))
export const replacePerson = (router: Router, id: string) =>
  replaceRoute(router, routes.person(id))
export const goPersonEdit = (router: Router, id?: string | null) =>
  pushRoute(router, routes.personEdit(id))
export const goEvent = (router: Router, id: string) => pushRoute(router, routes.event(id))
export const goEventEdit = (router: Router, id?: string | null) =>
  pushRoute(router, routes.eventEdit(id))
export const goCountry = (router: Router, id: string) => pushRoute(router, routes.country(id))
export const goByKind = (router: Router, kind: string, id: string) =>
  pushRoute(router, `/${kind}/${id}`)
export const goLogin = (router: Router) => replaceRoute(router, routes.login)
export const goHome = (router: Router) => replaceRoute(router, routes.tabs.home)
export const goBookmarks = (router: Router) => pushRoute(router, routes.bookmarks)
