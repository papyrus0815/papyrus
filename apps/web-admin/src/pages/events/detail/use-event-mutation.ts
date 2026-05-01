import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'react-hot-toast'

import { type UpdateEventDto, updateEvent } from '@/shared/api/events'

/**
 * 사건 부분 업데이트 — `UpdateEventDto`의 모든 필드는 optional이라
 * 호출 측이 변경된 필드만 담아 보내면 서버가 나머지는 건드리지 않는다
 * (`event.service.ts:280` `=== undefined` 가드).
 *
 * 배열 필드(eventSections·eventImages·relatedCountryIds 등)는 서버가
 * "delete-and-recreate" 패턴이므로 호출 측은 항상 *전체 배열*을 보낼 것.
 *
 * 성공은 페이지 우상단의 `SaveStatus` 인디케이터로만 시그널 — 토스트는 실패만.
 * 인라인 편집은 patch 빈도가 높아 매번 toast가 뜨면 폭격이 됨.
 */
export function useEventMutation(eventId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (patch: UpdateEventDto) => {
      return updateEvent(eventId, patch)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['event-detail', eventId] })
      // 목록(ledger/catalog) 캐시도 같이 — 한 사건 수정이 목록 정렬·라벨에 영향
      queryClient.invalidateQueries({ queryKey: ['events'] })
    },
    onError: (error: unknown) => {
      const message =
        error instanceof Error ? error.message : '알 수 없는 오류'
      toast.error(`저장 실패: ${message}`)
    },
  })
}
