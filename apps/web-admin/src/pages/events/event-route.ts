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
      // /events — 신규 ledger 페이지 (lens 칩 + 5축 피벗 + ⌘K 팔레트)
      index: true,
      lazy: async () => {
        const { EventsLedgerPage } = await import('./ledger/events-ledger.page')
        return { Component: EventsLedgerPage }
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
      // 신규 에디터 (v2) — 풀 페이지·좌측 섹션 네비.
      // 안정화 후 위 create / :eventId/edit 로 승격 예정.
      path: 'create/v2',
      lazy: async () => {
        const { default: EventEditorPage } =
          await import('./editor/event-editor.page')
        return { Component: EventEditorPage }
      },
    },
    {
      path: ':eventId/edit/v2',
      lazy: async () => {
        const { default: EventEditorPage } =
          await import('./editor/event-editor.page')
        return { Component: EventEditorPage }
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
