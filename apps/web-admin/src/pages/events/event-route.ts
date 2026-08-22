import {
  type LoaderFunctionArgs,
  type RouteObject,
  redirect,
} from 'react-router-dom'

import { pathKeys } from '@/shared/router'

/**
 * `/events/:eventId/edit` → `/events/:eventId` 흡수.
 *
 * 상세가 이미 **폼과 같은 필드를 전부** 인라인 편집한다:
 *  제목·기간·위치·요약·카테고리(detail-hero) / 키워드(detail-network) /
 *  관련 국가(detail-actors) / 이미지 CRUD·대표 지정(detail-appendix).
 * 서버는 `thumbnail`을 `isPrimary` 이미지에서 파생하므로(event.controller.ts) 폼의
 * '썸네일'도 상세의 대표 이미지 지정과 같은 것을 가리킨다 — 즉 이 라우트에는 **고유
 * 기능이 하나도 없었고**, 같은 필드를 고치는 세 번째 표면이었다.
 *
 * 라우트 자체는 남긴다 — 외부 링크·북마크가 404가 되지 않도록.
 */
const editRedirect = ({ params }: LoaderFunctionArgs) =>
  redirect(pathKeys.events.detail(params.eventId ?? ''))

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
      // 등록 폼은 전체 폭을 쓰므로 좌측 목록 셸 밖에 둔다.
      path: 'create',
      lazy: async () => {
        const { default: EventCreatePage } =
          await import('./create/event-create.page.refactored')
        return { Component: EventCreatePage }
      },
    },
    {
      // 수정은 상세 인라인 편집으로 흡수 — 위 editRedirect 주석 참고.
      path: ':eventId/edit',
      loader: editRedirect,
    },
    {
      /**
       * 목록·상세 공통 셸(좌측 사건 목록) — layout route라 둘을 오가도 유지된다.
       *
       * ContentLayout으로 한 겹 더 감싸는 이유: 좌측 사이드바는 `--header-height`만큼
       * 아래에서 시작해야 하는데, 그 오프셋과 스크롤 컨테이너를 주는 게 ContentLayout이다.
       * 이게 없으면 사이드바가 전역 헤더 뒤로 들어가 상단이 잘린다(국가·인물 지면은 이미
       * ContentLayout 안에 있어 문제가 없었다).
       */
      lazy: async () => {
        const { default: ContentLayout } =
          await import('@/widgets/content-layout/content-layout.ui')
        return { Component: ContentLayout }
      },
      children: [
        {
          lazy: async () => {
            const { EventsShell } = await import('./events-shell')
            return { Component: EventsShell }
          },
          children: [
            {
              // /events — 사건 리스트(catalog). ledger 페이지는 보류·미라우트.
              index: true,
              lazy: async () => {
                const { EventsCatalogPage } = await import('./list/events.page')
                return { Component: EventsCatalogPage }
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
        },
      ],
    },
  ],
}
