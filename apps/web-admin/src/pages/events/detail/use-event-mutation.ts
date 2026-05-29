import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'react-hot-toast'

import { type UpdateEventDto, updateEvent } from '@/shared/api/events'

import { type EventDetail } from './use-event-detail'

/**
 * 낙관적으로 캐시에 즉시 반영해도 안전한 *스칼라* 필드.
 *
 * 제외 기준: patch에는 id/스칼라만 들어오지만 화면이 보는 값은 derived 객체인 필드.
 *  - categoryId → `category`(이름·색) 객체로 표시되므로 patch만으로 못 맞춤.
 *  - parentEventId → `parentEvent`(브레드크럼) 객체.
 *  - 배열(eventSections·eventImages·relatedPersons·related*CountryIds) → server가
 *    delete-and-recreate하며 응답에 이름 등 join 데이터가 붙어, 낙관적 반영 시
 *    불일치. 이들은 refetch로만 반영(기존 동작 유지).
 * 위 필드는 여기 넣지 않아 refetch까지 기다린다 — 부분 반영 불일치 방지.
 */
const OPTIMISTIC_SCALAR_FIELDS = [
  'title',
  'description',
  'location',
  'background',
  'aftermath',
  'warCost',
  'startDate',
  'endDate',
  'startDatePrecision',
  'endDatePrecision',
  'keywords',
] as const satisfies ReadonlyArray<keyof UpdateEventDto>

/**
 * 사건 부분 업데이트 — `UpdateEventDto`의 모든 필드는 optional이라
 * 호출 측이 변경된 필드만 담아 보내면 서버가 나머지는 건드리지 않는다
 * (`event.service.ts` Prisma partial update — `undefined` = 변경 안 함).
 *
 * 배열 필드(eventSections·eventImages·relatedCountryIds 등)는 서버가
 * "delete-and-recreate" 패턴이므로 호출 측은 항상 *전체 배열*을 보낼 것.
 *
 * 성공은 페이지 우상단의 `SaveStatus` 인디케이터로만 시그널 — 토스트는 실패만.
 * 인라인 편집은 patch 빈도가 높아 매번 toast가 뜨면 폭격이 됨.
 *
 * 낙관적 업데이트(스칼라 한정):
 *  - 저장 즉시 캐시를 갱신해 RichText 저장 직후 read-view가 옛 값으로 깜빡이는
 *    문제를 없앤다.
 *  - useUndoablePatch는 `event`(=캐시) 스냅샷으로 inverse를 만든다. 낙관적 갱신으로
 *    캐시가 즉시 최신화되므로, refetch 전 빠른 연속 편집에서도 inverse가 *직전
 *    상태*를 정확히 가리킨다(과거엔 stale 스냅샷을 잡아 undo가 과도하게 회귀).
 *  - 실패 시 onError에서 스냅샷으로 롤백.
 */
export function useEventMutation(eventId: string) {
  const queryClient = useQueryClient()
  const detailKey = ['event-detail', eventId] as const
  const mutationKey = ['event-detail-mutation', eventId] as const

  return useMutation({
    mutationKey,
    mutationFn: async (patch: UpdateEventDto) => {
      return updateEvent(eventId, patch)
    },
    onMutate: async (patch: UpdateEventDto) => {
      const picked: Record<string, unknown> = {}
      for (const k of OPTIMISTIC_SCALAR_FIELDS) {
        if (k in patch) picked[k] = (patch as Record<string, unknown>)[k]
      }
      // 낙관적으로 반영할 스칼라가 없으면(배열/카테고리 등) 캐시를 건드리지 않는다.
      if (Object.keys(picked).length === 0) return { previous: undefined }

      // in-flight refetch가 낙관적 갱신을 덮어쓰지 않도록 취소 후 스냅샷.
      await queryClient.cancelQueries({ queryKey: detailKey })
      const previous = queryClient.getQueryData<EventDetail>(detailKey)
      if (previous) {
        queryClient.setQueryData<EventDetail>(detailKey, {
          ...previous,
          ...(picked as Partial<EventDetail>),
        })
      }
      return { previous }
    },
    onSuccess: (_data, patch) => {
      /**
       * 같은 사건의 *다른* mutation이 아직 in-flight면 detail refetch를 미룬다.
       * (onSuccess 시점엔 자신은 이미 settled라 isMutating 집계에서 빠지므로, 0이면
       * 내가 마지막.) 먼저 끝난 mutation이 refetch해 낙관적 최신값을 옛 서버 응답으로
       * 되돌리는 역행 깜빡임을 막고, 마지막 mutation만 최종 reconcile한다.
       */
      if (queryClient.isMutating({ mutationKey }) === 0) {
        queryClient.invalidateQueries({ queryKey: detailKey })
      }
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
    onError: (error: unknown, _patch, context) => {
      // 낙관적 반영 롤백 — 스냅샷이 있을 때만.
      if (context?.previous) {
        queryClient.setQueryData(detailKey, context.previous)
      }
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
