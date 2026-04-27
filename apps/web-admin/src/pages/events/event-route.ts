import { RouteObject } from 'react-router-dom'

/**
 * 🗺️ Events 페이지 라우트 설정
 *
 * 헤더에서 "사건" 메뉴를 클릭하면 /events 경로로 이동합니다.
 * Lazy loading으로 초기 번들 크기를 최적화합니다.
 */
export const eventPageRoute: RouteObject = {
  path: 'events',
  children: [
    {
      index: true,
      lazy: async () => {
        const { EventsCatalogPage } = await import('./list/events.page')
        return { Component: EventsCatalogPage }
      },
    },
    {
      path: 'create',
      lazy: async () => {
        const { default: EventCreatePage } =
          await import('./create/event-create.page.refactored')
        return { Component: EventCreatePage }
      },
    },
    {
      path: ':eventId/edit',
      lazy: async () => {
        const { default: EventCreatePage } =
          await import('./create/event-create.page.refactored')
        return { Component: EventCreatePage }
      },
    },
    {
      path: ':eventId',
      lazy: async () => {
        const { default: EventDetailPage } =
          await import('./detail/event-detail.page')
        return { Component: EventDetailPage }
      },
    },
  ],
}
