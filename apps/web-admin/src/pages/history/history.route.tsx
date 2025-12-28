import { RouteObject } from 'react-router'

import { ROUTES } from '../../shared/constants/routes'
import HistoryLayout from '../../widgets/history-layout/history-layout.ui'

/**
 * 🗺️ History 페이지 라우트 설정
 *
 * 장점:
 * - 상수(ROUTES) 사용으로 일관성과 타입 안전성 확보
 * - Lazy loading으로 초기 번들 크기 최적화
 * - 병렬 로딩으로 성능 개선
 */
export const historyPageRoute: RouteObject = {
  path: ROUTES.HISTORY.ROOT,
  children: [
    {
      // 나머지는 HistoryLayout (사이드바 포함)
      element: <HistoryLayout />,
      children: [
        {
          index: true,
          lazy: async () => {
            const [{ countryLoader }, { default: Component }] =
              await Promise.all([
                import('./country/country.loader'),
                import('./country/country.page'),
              ])
            return { loader: countryLoader, Component }
          },
        },
        {
          path: ROUTES.HISTORY.COUNTRY,
          lazy: async () => {
            const [{ countryLoader }, { default: Component }] =
              await Promise.all([
                import('./country/country.loader'),
                import('./country/country.page'),
              ])
            return { loader: countryLoader, Component }
          },
        },
        {
          path: ROUTES.HISTORY.CONTINENTS,
          lazy: async () => {
            const [{ continentsLoader }, { default: Component }] =
              await Promise.all([
                import('./continents/continents.loader'),
                import('./continents/continents.page'),
              ])
            return { loader: continentsLoader, Component }
          },
        },
        {
          path: 'persons',
          lazy: async () => {
            const { default: Component } = await import(
              '../persons/person.page'
            )
            return { Component }
          },
        },
        {
          path: 'persons/create',
          lazy: async () => {
            const { default: Component } = await import(
              '../persons/person-create.page'
            )
            return { Component }
          },
        },
        {
          path: 'persons/:id',
          lazy: async () => {
            const { default: Component } = await import(
              '../persons/person-detail.page'
            )
            return { Component }
          },
        },
        {
          path: 'dynasties',
          lazy: async () => {
            const { DynastyPage } = await import('./dynasty/dynasty.page')
            return { Component: DynastyPage }
          },
        },
        {
          path: 'jobs',
          lazy: async () => {
            const { JobPage } = await import('./job/job.page')
            return { Component: JobPage }
          },
        },
        {
          path: 'military-units',
          lazy: async () => {
            const { MilitaryUnitPage } = await import(
              './military-unit/military-unit.page'
            )
            return { Component: MilitaryUnitPage }
          },
        },
      ],
    },
  ],
}
