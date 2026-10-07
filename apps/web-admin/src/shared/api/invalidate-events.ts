// apps/web-admin/src/shared/api/invalidate-events.ts
import type { QueryClient } from '@tanstack/react-query'

/**
 * 사건을 만들거나 고친 뒤, **같은 사건을 보여 주는 다른 지면**의 캐시를 한 번에 무효화한다.
 *
 * 사건은 키 접두사가 제각각인 여러 지면에 캐시된다 — 목록·피커(`['events', …]`),
 * 상세(`['event-detail', id]`), 헤더 총개수(`['events-count']`), 국가 대시보드
 * (`['events-by-country']`), 홈 대시보드(`['dashboard-recent-events']`), 인물 상세
 * (`['person-detail']`). 국가 대시보드 등록 폼·행정부 사건 연결 모달은 `createEvent`/
 * `updateEvent`를 부르고 **아무것도 무효화하지 않아**, 등록 직후 사건 목록·사이드바·인물
 * 상세가 staleTime 동안 옛 값을 보였다. 직접 mutation을 부르는 곳은 이 헬퍼를 거친다.
 *
 * 키는 `eventKeys`(pages/events/detail/use-event-detail)·`personKeys`(entities/person)의
 * 미러다 — shared 계층이라 그 모듈을 import할 수 없어 접두사를 직접 적는다
 * (`invalidate-tenure.ts`와 같은 방식). 모두 prefix 무효화라 마운트된 쿼리만 다시 받는다.
 */
export interface InvalidateEventScope {
  /** 고친 사건 — 주면 그 상세만, 없으면 열린 상세 전부를 무효화 */
  eventId?: string | null
  /** 개수가 바뀌는 변경(생성·삭제)인가 — 헤더 '전체 N건' 무효화 여부 */
  countChanged?: boolean
}

export function invalidateEventQueries(
  queryClient: QueryClient,
  scope: InvalidateEventScope = {},
): void {
  const invalidate = (queryKey: readonly unknown[]) => {
    void queryClient.invalidateQueries({ queryKey })
  }

  // 목록·좌측 사이드바·연결 후보 피커 — 전부 ['events'] 아래
  invalidate(['events'])
  if (scope.countChanged) invalidate(['events-count'])
  invalidate(scope.eventId ? ['event-detail', scope.eventId] : ['event-detail'])

  // 사건이 박힌 다른 지면
  invalidate(['events-by-country'])
  invalidate(['dashboard-recent-events'])
  invalidate(['person-detail'])
}
