import { useQuery } from '@tanstack/react-query'

import { getEventRelations } from '@/shared/api/event-relations'

/**
 * 관련 사건(EventRelation) 조회 — 연관 섹션의 '관련 사건' 블록·섹션 부제·사실 장부가 같은 캐시를 쓴다.
 * 한 관계는 양쪽 사건에 보이므로, 쓰기 뒤에는 프리픽스(eventRelationKeys.all)로 통째 무효화한다.
 */
export const eventRelationKeys = {
  all: ['event-relations'] as const,
  byEvent: (eventId: string) => ['event-relations', eventId] as const,
}

export function useEventRelations(eventId: string) {
  return useQuery({
    queryKey: eventRelationKeys.byEvent(eventId),
    queryFn: () => getEventRelations(eventId),
    staleTime: 60_000,
  })
}
