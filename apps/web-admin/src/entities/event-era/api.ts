/** 사건 시대 조회 훅. 재위 파생 읽기 모델이라 자주 바뀌지 않는다 — staleTime을 길게. */
import { useQuery } from '@tanstack/react-query'

import { getEventEras, type EventEra } from '@/shared/api/event-eras'

export type { EventEra }

export const eventEraKeys = {
  all: ['event-eras'] as const,
}

export function useEventEras(enabled = true) {
  return useQuery<EventEra[]>({
    queryKey: eventEraKeys.all,
    queryFn: getEventEras,
    enabled,
    staleTime: 5 * 60_000,
  })
}
