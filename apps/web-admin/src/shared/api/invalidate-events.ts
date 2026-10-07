// apps/web-admin/src/shared/api/invalidate-events.ts
import type { QueryClient } from '@tanstack/react-query'

import { eventKeys } from './event-query-keys'

/**
 * 사건을 만들거나 고친 뒤, **같은 사건을 보여 주는 다른 지면**의 캐시를 한 번에 무효화한다.
 *
 * 목록류(목록·피커·국가 대시보드·홈 대시보드·총개수)는 전부 `eventKeys.lists()` 아래라
 * 한 번에 무효화되고, 상세와 인물 상세(사건 탭)는 따로 건다. 국가 대시보드 등록 폼·행정부
 * 사건 연결 모달은 mutation을 직접 부르고 아무것도 무효화하지 않아, 등록 직후 다른 지면이
 * staleTime 동안 옛 값을 보였다. mutation을 직접 부르는 곳은 이 헬퍼를 거친다.
 *
 * 인물 상세 키(`['person-detail']`)는 entities/person의 미러다 — shared 계층이라 import할 수
 * 없어 접두사를 직접 적는다(`invalidate-tenure.ts`와 같은 방식). 모두 prefix 무효화라 마운트된
 * 쿼리만 다시 받는다.
 */
export interface InvalidateEventScope {
  /** 고친 사건 — 주면 그 상세만, 없으면 열린 상세 전부를 무효화 */
  eventId?: string | null
}

export function invalidateEventQueries(
  queryClient: QueryClient,
  scope: InvalidateEventScope = {},
): void {
  const invalidate = (queryKey: readonly unknown[]) => {
    void queryClient.invalidateQueries({ queryKey })
  }

  // 목록·사이드바·연결 후보·국가 대시보드·홈 대시보드·총개수 — 전부 ['events'] 아래
  invalidate(eventKeys.lists())
  invalidate(scope.eventId ? eventKeys.detail(scope.eventId) : eventKeys.detailAll())
  // 인물 상세 '사건' 탭
  invalidate(['person-detail'])
}
