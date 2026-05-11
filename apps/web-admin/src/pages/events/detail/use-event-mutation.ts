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
    onSuccess: (_data, patch) => {
      queryClient.invalidateQueries({ queryKey: ['event-detail', eventId] })
      /**
       * 목록(ledger/catalog) 쪽 캐시는 *목록 표시에 영향 있는 필드*가 바뀌었을 때만
       * 무효화. 본문(background, aftermath, eventSections 등) patch는 목록에 영향
       * 없으므로 인라인 편집 빈도가 높은 키스트로크 흐름에서 불필요한 refetch를
       * 유발하지 않도록 한다.
       */
      if (patchAffectsListing(patch)) {
        queryClient.invalidateQueries({ queryKey: ['events'] })
      }
    },
    onError: (error: unknown) => {
      const message =
        error instanceof Error ? error.message : '알 수 없는 오류'
      toast.error(`저장 실패: ${message}`)
    },
  })
}

const LISTING_FIELDS: ReadonlyArray<keyof UpdateEventDto> = [
  'title',
  'startDate',
  'endDate',
  'startDatePrecision',
  'endDatePrecision',
  'categoryId',
  'location',
  'parentEventId',
  'description',
]

function patchAffectsListing(patch: UpdateEventDto): boolean {
  return LISTING_FIELDS.some((k) => k in patch)
}
