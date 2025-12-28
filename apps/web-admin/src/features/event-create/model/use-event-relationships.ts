/**
 * 이벤트 관계 정보 상태 관리 Hook
 * FSD: features/event-create/model
 */
import { useRef, useState } from 'react'

import type { CountryResponseDto } from '@/shared/api/countries'
import type { EventResponseDto } from '@/shared/api/events'
import type { HistoricalCountryResponseDto } from '@/shared/api/historical-countries'
import type { MilitaryUnit } from '@/shared/api/military-unit'
import type { PersonResponseDto } from '@/shared/api/persons'

import type { EventBelligerentsGraph } from '../../../pages/events/types/belligerents-graph.types'

export const useEventRelationships = () => {
  // 부모 이벤트
  const [parentEventId, setParentEventId] = useState('')
  const [parentEventSearch, setParentEventSearch] = useState('')
  const [showParentEventList, setShowParentEventList] = useState(false)
  const [parentEventData, setParentEventData] =
    useState<EventResponseDto | null>(null)
  const parentEventSelectorRef = useRef<HTMLDivElement>(null)

  // 하위 사건들의 관계 데이터
  const [childEventsRelations, setChildEventsRelations] = useState<
    Array<{
      relation: EventBelligerentsGraph
      sourceName: string
    }>
  >([])

  // 관련 인물
  const [relatedPersons, setRelatedPersons] = useState<
    Array<{ personId: string; role: string; note: string }>
  >([])
  const [personSearch, setPersonSearch] = useState('')
  const [showPersonList, setShowPersonList] = useState(false)
  const [availablePersons, setAvailablePersons] = useState<PersonResponseDto[]>(
    [],
  )
  const personSelectorRef = useRef<HTMLDivElement>(null)

  // 관련 사건
  const [relatedEventIds, setRelatedEventIds] = useState<string[]>([])
  const [relatedEventSearch, setRelatedEventSearch] = useState('')
  const [showRelatedEventList, setShowRelatedEventList] = useState(false)
  const relatedEventSelectorRef = useRef<HTMLDivElement>(null)
  const [availableEvents, setAvailableEvents] = useState<EventResponseDto[]>([])

  // 관련 국가
  const [relatedCountryIds, setRelatedCountryIds] = useState<string[]>([])
  const [relatedHistoricalCountryIds, setRelatedHistoricalCountryIds] =
    useState<string[]>([])
  const [showCountryModal, setShowCountryModal] = useState(false)
  const [countrySearchTerm, setCountrySearchTerm] = useState('')

  // 멘션 시스템용 엔티티 데이터
  const [availableCountries, setAvailableCountries] = useState<
    CountryResponseDto[]
  >([])
  const [availableHistoricalCountries, setAvailableHistoricalCountries] =
    useState<HistoricalCountryResponseDto[]>([])
  const [availableMilitaryUnits, setAvailableMilitaryUnits] = useState<
    MilitaryUnit[]
  >([])

  return {
    // 부모 이벤트
    parentEventId,
    setParentEventId,
    parentEventSearch,
    setParentEventSearch,
    showParentEventList,
    setShowParentEventList,
    parentEventData,
    setParentEventData,
    parentEventSelectorRef,

    // 하위 사건 관계
    childEventsRelations,
    setChildEventsRelations,

    // 관련 인물
    relatedPersons,
    setRelatedPersons,
    personSearch,
    setPersonSearch,
    showPersonList,
    setShowPersonList,
    availablePersons,
    setAvailablePersons,
    personSelectorRef,

    // 관련 사건
    relatedEventIds,
    setRelatedEventIds,
    relatedEventSearch,
    setRelatedEventSearch,
    showRelatedEventList,
    setShowRelatedEventList,
    relatedEventSelectorRef,
    availableEvents,
    setAvailableEvents,

    // 관련 국가
    relatedCountryIds,
    setRelatedCountryIds,
    relatedHistoricalCountryIds,
    setRelatedHistoricalCountryIds,
    showCountryModal,
    setShowCountryModal,
    countrySearchTerm,
    setCountrySearchTerm,

    // 엔티티 데이터
    availableCountries,
    setAvailableCountries,
    availableHistoricalCountries,
    setAvailableHistoricalCountries,
    availableMilitaryUnits,
    setAvailableMilitaryUnits,
  }
}

export type EventRelationshipsState = ReturnType<typeof useEventRelationships>
