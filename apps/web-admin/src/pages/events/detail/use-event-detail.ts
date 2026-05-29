import { useCallback, useMemo } from 'react'

import {
  queryOptions,
  useQueryClient,
  useSuspenseQuery,
} from '@tanstack/react-query'

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
    profileImageUrl?: string | null
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

export interface EventDetailBelligerentSide {
  name: string
  countries: Array<Record<string, unknown>>
  commander?: string
  commanderPersonId?: string
  forces?: string
  deployedUnits?: string[]
  weaponsUsed?: string[]
  description?: string
  parentSideId?: string
  level?: 'coalition' | 'country' | 'force'
}

export interface EventDetailTreaty {
  id: string
  name: string
  signDate: string
  expiryDate?: string
  violationDate?: string
  signatories: string[]
  type: string
  terms: string[]
  description?: string
}

export interface EventDetailBelligerents {
  sides: EventDetailBelligerentSide[]
  metadata?: {
    countryRelations?: Array<Record<string, unknown>>
    treaties?: EventDetailTreaty[]
    alliances?: Array<Record<string, unknown>>
  }
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
  belligerents?: EventDetailBelligerents | null
  casualties?: Record<string, unknown> | null
  militaryDetails?: Record<string, unknown> | null
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
  | 'treaties'
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

  const enabledModules = useMemo<EventDetailModuleKey[]>(() => {
    const keys: EventDetailModuleKey[] = []
    if (event.belligerents?.sides?.length) keys.push('belligerents')
    if (event.casualties) keys.push('casualties')
    if (event.militaryDetails) keys.push('military-details')
    if (event.belligerents?.metadata?.treaties?.length) keys.push('treaties')
    if (event.cabinetEvents?.length) keys.push('cabinets')
    return keys
  }, [event])

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
