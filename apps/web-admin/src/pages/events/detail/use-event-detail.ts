import { useMemo } from 'react'

import { useQuery } from '@tanstack/react-query'

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

export interface UseEventDetailResult {
  event: EventDetail | undefined
  isLoading: boolean
  isError: boolean
  error: Error | null
  enabledModules: EventDetailModuleKey[]
}

export function useEventDetail(eventId: string | undefined): UseEventDetailResult {
  const query = useQuery({
    queryKey: ['event-detail', eventId],
    queryFn: () =>
      getEventById(eventId as string) as unknown as Promise<EventDetail>,
    enabled: Boolean(eventId),
    staleTime: 30_000,
  })

  const enabledModules = useMemo<EventDetailModuleKey[]>(() => {
    const event = query.data
    if (!event) return []
    const keys: EventDetailModuleKey[] = []
    if (event.belligerents?.sides?.length) keys.push('belligerents')
    if (event.casualties) keys.push('casualties')
    if (event.militaryDetails) keys.push('military-details')
    if (event.belligerents?.metadata?.treaties?.length) keys.push('treaties')
    if (event.cabinetEvents?.length) keys.push('cabinets')
    return keys
  }, [query.data])

  return {
    event: query.data,
    isLoading: query.isLoading,
    isError: query.isError,
    error: (query.error as Error | null) ?? null,
    enabledModules,
  }
}
