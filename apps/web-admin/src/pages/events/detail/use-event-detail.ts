import { useCallback, useMemo } from 'react'

import {
  queryOptions,
  useQueryClient,
  useSuspenseQuery,
} from '@tanstack/react-query'

import { type NormalizedMilitaryEventResponse } from '@/features/event-create/lib'
import { getEventById } from '@/shared/api/events'

/**
 * SDK가 Primitive<>로 래핑되면서 EventResponseDto의 다수 중첩 필드 타입이
 * `any`로 풀린다. detail 페이지가 실제로 다루는 모양을 단일 정본 타입으로
 * 명시한다(EventResponseDto와 별도 — extends 하지 않는다, intersection으로
 * any를 덮지 못하기 때문).
 */
export interface EventDetailPerson {
  id: string
  personId: string
  role?: string | null
  note?: string | null
  person?: {
    id: string
    name?: string | null
    surname?: string | null
    middleName?: string | null
    profileImageUrl?: string | null
    /** 개인 이름 표시 순서 오버라이드 (korean=성→이름, western=이름→성) */
    nameDisplayOrder?: string | null
    /** 소속 국가 기본 이름 표시 순서 — 개인 오버라이드 없을 때 사용 */
    country?: { defaultNameDisplayOrder?: string | null } | null
  } | null
}

export interface EventDetailImage {
  id: string
  imageUrl: string
  caption?: string
  source?: string
  order: number
  isPrimary: boolean
}

export interface EventDetailSection {
  id: string
  title: string
  content: string
  order: number
  sectionType: string
}

export interface EventDetailCategory {
  id: string
  name: string
  description?: string | null
}

export interface EventDetailCountryRef {
  id: string
  name: string
  flagEmoji?: string
}

export interface EventDetailHistoricalCountryRef {
  id: string
  name: string
}

export interface EventDetailCabinetEvent {
  id: string
  cabinetId: string
  role: 'ORIGIN' | 'PARTY' | 'MEDIATOR' | 'AFFECTED' | null
  note: string | null
  cabinet: Record<string, unknown>
}

export interface EventDetail {
  id: string
  title: string
  description?: string | null
  startDate?: string | null
  startDatePrecision?: string | null
  endDate?: string | null
  endDatePrecision?: string | null
  location?: string | null
  categoryId?: string | null
  category?: EventDetailCategory
  background?: string | null
  aftermath?: string | null
  keywords?: string[] | null
  parentEventId?: string | null
  parentEvent?: EventDetail
  childEvents?: EventDetail[]
  cityId?: string | null
  administrativeDivisionId?: string | null
  historicalCountryId?: string | null
  eventSections?: EventDetailSection[]
  eventImages?: EventDetailImage[]
  thumbnail?: string | null
  relatedCountryIds?: string[]
  relatedHistoricalCountryIds?: string[]
  relatedCountries?: EventDetailCountryRef[]
  relatedHistoricalCountries?: EventDetailHistoricalCountryRef[]
  relatedPersons?: EventDetailPerson[]
  /**
   * 정규화 군사 정보 — 서버 응답에 런타임 전용으로 실려온다(SDK 타입엔 없어 @ts-ignore로
   * 주입됨). 상세 군사 모듈(교전 진영·사상자·작전 정보)의 *단일 정본*. 과거의 legacy
   * belligerents/casualties/militaryDetails 필드는 서버가 내려주지도 저장하지도 않아
   * 제거했다. 편집은 항상 이 전체 객체를 재구성해 `onPatch({ militaryEvent })`로 보낸다
   * (saveMilitaryData가 전체 삭제-재생성이므로 부분 전송 금지).
   */
  militaryEvent?: NormalizedMilitaryEventResponse | null
  warCost?: string | null
  cabinetEvents?: EventDetailCabinetEvent[]
  createdAt?: string
  updatedAt?: string
}

/**
 * 사건 상세 데이터 + 표시 가능한 모듈 키 목록을 한 번에 돌려준다.
 *
 * `enabledModules`는 응답 페이로드의 존재 여부만으로 판정 — 카테고리 메타에
 * 의존하지 않는다(카테고리 → 모듈 매핑을 스키마화하는 건 후속 사이클).
 */
export type EventDetailModuleKey =
  | 'belligerents'
  | 'casualties'
  | 'military-details'
  | 'cabinets'

/**
 * 사건 캐시 키 — 상세 query·mutation invalidation에서 단일 정의를 공유한다.
 * (키 문자열을 곳곳에 흩뿌리면 invalidate 누락·불일치가 생기므로 중앙화.)
 */
export const eventKeys = {
  /** 목록(ledger/catalog) 캐시 루트 */
  lists: () => ['events'] as const,
  /** 단일 사건 상세 */
  detail: (eventId: string) => ['event-detail', eventId] as const,
  /** 헤더 "전체 N건" 권위 총개수 — 생성·수정·삭제 시 lists()와 함께 무효화할 것 */
  count: () => ['events-count'] as const,
}

/**
 * 사건 상세 쿼리 옵션 — useSuspenseQuery뿐 아니라 prefetchQuery/ensureQueryData
 * (라우트 로더·hover prefetch 등)에서도 그대로 재사용 가능한 단일 정의.
 */
export function eventDetailQueryOptions(eventId: string) {
  return queryOptions({
    queryKey: eventKeys.detail(eventId),
    queryFn: () => getEventById(eventId) as unknown as Promise<EventDetail>,
    staleTime: 30_000,
  })
}

export interface UseEventDetailResult {
  event: EventDetail
  enabledModules: EventDetailModuleKey[]
}

/**
 * 사건 상세 + 표시 가능한 모듈 키.
 *
 * Suspense 기반 — 로딩은 상위 `<Suspense>`, 에러는 상위 ErrorBoundary가 처리하므로
 * 호출부는 항상 *해소된* event를 받는다(`isLoading`/`isError` 분기 불필요).
 */
export function useEventDetail(eventId: string): UseEventDetailResult {
  const { data: event } = useSuspenseQuery(eventDetailQueryOptions(eventId))

  // event 전체를 deps로 두면 매 patch/refetch마다 새 배열을 만들어 하위 sections
  // memo까지 무효화된다. 모듈 활성 여부만 결정하는 원시값으로 deps를 좁힌다.
  const belligerentCount = event.militaryEvent?.belligerentSides?.length ?? 0
  const casualtyCount = event.militaryEvent?.casualties?.length ?? 0
  const hasMilitaryDetails = Boolean(event.militaryEvent?.militaryDetails)
  const cabinetCount = event.cabinetEvents?.length ?? 0
  const enabledModules = useMemo<EventDetailModuleKey[]>(() => {
    const keys: EventDetailModuleKey[] = []
    if (belligerentCount) keys.push('belligerents')
    if (casualtyCount) keys.push('casualties')
    if (hasMilitaryDetails) keys.push('military-details')
    if (cabinetCount) keys.push('cabinets')
    return keys
  }, [belligerentCount, casualtyCount, hasMilitaryDetails, cabinetCount])

  return { event, enabledModules }
}

/**
 * 사건 상세를 *미리* 캐시에 적재하는 prefetch 핸들러를 돌려준다. 상세로 가는 링크의
 * hover/focus에 붙이면 클릭 시점엔 데이터가 이미 따뜻해져 즉시 렌더된다.
 *
 * `prefetchQuery`는 staleTime(30s) 내 캐시가 있으면 자동 no-op이라 hover 반복도 안전.
 * 전역 QueryClient가 retry:false라 404 같은 실패도 조용히 끝난다(콘솔 경고만).
 */
export function usePrefetchEventDetail(): (
  eventId: string | null | undefined,
) => void {
  const queryClient = useQueryClient()
  return useCallback(
    (eventId: string | null | undefined) => {
      if (!eventId) return
      void queryClient.prefetchQuery(eventDetailQueryOptions(eventId))
    },
    [queryClient],
  )
}
