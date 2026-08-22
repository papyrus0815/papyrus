/**
 * `/events` · `/events/:eventId` 공통 셸 — React Router layout route.
 *
 * 국가·인물 지면과 같은 좌우 구조를 사건에도 준다: 좌측 사건 목록(EventListSidebar),
 * 우측은 `<Outlet/>`(카탈로그 또는 상세). layout route라 목록↔상세를 오가도 사이드바가
 * 언마운트되지 않아 스크롤·접힘 상태와 전량 로드 캐시가 보존된다.
 *
 * `/events/create`는 이 셸 밖 — 전체 폭을 쓰는 등록 폼이라 좌측 목록이 방해가 된다.
 */
import { Outlet, useNavigate, useParams } from 'react-router-dom'

import { pathKeys } from '@/shared/router'
import { ContentShell } from '@/widgets/content-shell'
import { EventListSidebar } from '@/widgets/event/event-list-sidebar'

export function EventsShell() {
  const navigate = useNavigate()
  const params = useParams<{ eventId?: string }>()

  return (
    <ContentShell
      /* 모바일에서는 좌측이 숨겨지므로 우측(목록·상세)을 반드시 보여야 한다 */
      mobileDetailVisible
      /* 기본 접힘 — 사건 카탈로그는 "전체 화면을 써야 한다"는 결정으로 캡·중앙정렬을 걷어낸
         지면이라(styles/layout.styles.ts 주석), 360px 사이드바를 기본으로 펼치면 툴바가
         3줄로 접히며 그 결정을 되돌린다. rail은 항상 보이고 한 번 펼치면 상태가 유지된다. */
      listCollapsedConfig={{
        storageKey: 'events-list-collapsed',
        defaultCollapsed: true,
      }}
      left={({ listCollapsed, toggleListCollapsed }) => (
        <EventListSidebar
          selectedId={params.eventId ?? null}
          collapsed={listCollapsed}
          onToggleCollapse={toggleListCollapsed}
          onAdd={() => navigate(pathKeys.events.create())}
        />
      )}
      right={<Outlet />}
    />
  )
}
