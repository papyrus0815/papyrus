import { RouteObject } from 'react-router'

/** /heads-of-state — 역대 수장 통합 비교 (현대·역사 국가 모두) */
export const headsOfStateRoute: RouteObject = {
  path: 'heads-of-state',
  lazy: async () => ({
    Component: (await import('./heads-of-state.page')).default,
  }),
}
