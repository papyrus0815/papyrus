import { LazyRouteFunction, RouteObject } from 'react-router-dom'

/**
 * ⚡️ 메인 레이아웃을 위한 Lazy-loaded 라우트 설정.
 *
 * 사용자가 관련 페이지에 처음 접근할 때까지
 * 레이아웃 컴포넌트(Component)와 데이터 로더(loader)의 코드를
 * 다운로드하지 않아 초기 로딩 성능을 최적화함.
 */
export const lazyLayout: LazyRouteFunction<RouteObject> = async () => {
  const [Component, loader] = await Promise.all([
    import('./layout.ui').then((module) => module.default),
    import('./layout.loader').then((module) => module.layoutLoader), // loader 함수를 명시적으로 export
  ])

  return { Component, loader }
}
