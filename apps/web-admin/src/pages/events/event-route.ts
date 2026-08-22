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
 * 목록·상세는 콘텐츠 영역(ContentLayout) 안에 있고, 좌측 사건 목록 사이드바는
 * 레이아웃(ContentAreaShell)이 소유한다 — 목록↔상세를 오가도 사이드바가 유지된다.
 * 등록 폼은 전체 폭을 쓰므로 콘텐츠 영역 밖(eventFormRoutes)에 둔다.
 */
export const eventPageRoute: RouteObject = {
  path: 'events',
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
}

/** 콘텐츠 영역 밖(좌측 목록 없음)에 두는 사건 라우트 */
export const eventFormRoutes: RouteObject[] = [
  {
    path: 'events/create',
    lazy: async () => {
      const { default: EventCreatePage } =
        await import('./create/event-create.page.refactored')
      return { Component: EventCreatePage }
    },
  },
  {
    // 수정은 상세 인라인 편집으로 흡수 — 위 editRedirect 주석 참고.
    path: 'events/:eventId/edit',
    loader: editRedirect,
  },
]
