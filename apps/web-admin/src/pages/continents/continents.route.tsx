import { RouteObject } from 'react-router'

/**
 * /continents — 대륙 페이지.
 * 좌측 대륙 목록은 레이아웃(ContentAreaShell)이 소유한다. 사이드바 행을 고르면
 * `?continentId=`가 붙고 본문의 해당 표 행으로 스크롤한다.
 */
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
