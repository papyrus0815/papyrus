import { RouteObject } from 'react-router'

/** /continents — 대륙 페이지 */
export const continentsRoute: RouteObject = {
  path: 'continents',
  lazy: async () => {
    const [{ continentsLoader }, { default: Component }] = await Promise.all([
      import('./continents.loader'),
      import('./continents.page'),
    ])
    return { loader: continentsLoader, Component }
  },
}
