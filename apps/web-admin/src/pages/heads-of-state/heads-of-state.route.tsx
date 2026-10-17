import { RouteObject } from 'react-router'

/** /heads-of-state — 역대 수장 통합 비교 (현대·역사 국가 모두) */
export const headsOfStateRoute: RouteObject = {
  path: 'heads-of-state',
  children: [
    {
      index: true,
      lazy: async () => ({
        Component: (await import('./heads-of-state.page')).default,
      }),
    },
    /** /heads-of-state/atlas — 같은 연도의 군주를 지도 위에 (전쟁·동맹 선) */
    {
      path: 'atlas',
      lazy: async () => ({
        Component: (await import('./heads-of-state-atlas.page')).default,
      }),
    },
  ],
}
