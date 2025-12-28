/**
 * Event Form Feature - Relationships Form State
 * FSD: features/event-form/model
 */

import { useState, useMemo, useRef, useEffect } from 'react'

import type { EventResponseDto } from '@/shared/api/events'
import type { PersonResponseDto } from '@/shared/api/persons'
import { getEventById } from '@/shared/api/events'

export const useRelationshipsForm = (
  availableEvents: EventResponseDto[],
  availablePersons: PersonResponseDto[],
) => {
  // 부모 사건
  const [parentEventId, setParentEventId] = useState('')
  const [parentEventSearch, setParentEventSearch] = useState('')
  const [showParentEventList, setShowParentEventList] = useState(false)
  const [parentEventData, setParentEventData] = useState<EventResponseDto | null>(null)
  const parentEventSelectorRef = useRef<HTMLDivElement>(null)

  // 관련 인물
  const [relatedPersons, setRelatedPersons] = useState<
    Array<{ personId: string; role: string; note: string }>
  >([])
  const [personSearch, setPersonSearch] = useState('')
  const [showPersonList, setShowPersonList] = useState(false)
  const personSelectorRef = useRef<HTMLDivElement>(null)

  // 관련 사건
  const [relatedEventIds, setRelatedEventIds] = useState<string[]>([])
  const [relatedEventSearch, setRelatedEventSearch] = useState('')
  const [showRelatedEventList, setShowRelatedEventList] = useState(false)
  const relatedEventSelectorRef = useRef<HTMLDivElement>(null)

  // 필터링된 목록
  const filteredParentEvents = useMemo(() => {
    const searchTerm = parentEventSearch.toLowerCase().trim()
    if (!searchTerm) {
      return availableEvents.slice(0, 10)
    }
    return availableEvents.filter(
      (event) =>
        event.title.toLowerCase().includes(searchTerm) ||
        (event.description && event.description.toLowerCase().includes(searchTerm)),
    )
  }, [parentEventSearch, availableEvents])

  const filteredPersons = useMemo(() => {
    const searchTerm = personSearch.toLowerCase().trim()
    if (!searchTerm) {
      return availablePersons.slice(0, 10)
    }
    return availablePersons.filter((person) =>
      person.name?.toLowerCase().includes(searchTerm),
    )
  }, [personSearch, availablePersons])

  const filteredRelatedEvents = useMemo(() => {
    const searchTerm = relatedEventSearch.toLowerCase().trim()
    const excludeIds = [parentEventId, ...relatedEventIds].filter(Boolean)
    let events = availableEvents.filter((event) => !excludeIds.includes(event.id))

    if (!searchTerm) {
      return events.slice(0, 10)
    }
    return events.filter(
      (event) =>
        event.title.toLowerCase().includes(searchTerm) ||
        (event.description && event.description.toLowerCase().includes(searchTerm)),
    )
  }, [relatedEventSearch, parentEventId, relatedEventIds, availableEvents])

  // 부모 사건 데이터 로드
  useEffect(() => {
    if (parentEventId) {
      const selectedEvent = availableEvents.find((e) => e.id === parentEventId)
      if (selectedEvent && parentEventSearch !== selectedEvent.title) {
        setParentEventSearch(selectedEvent.title)
      }

      getEventById(parentEventId)
        .then((event) => {
          console.log('📥 부모 사건 로드:', event)
          setParentEventData(event)
        })
        .catch((error) => {
          console.error('부모 사건 정보 로드 실패:', error)
          setParentEventData(null)
        })
    } else if (!parentEventId && parentEventSearch) {
      setParentEventData(null)
    }
  }, [parentEventId])

  // 외부 클릭 처리
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        parentEventSelectorRef.current &&
        !parentEventSelectorRef.current.contains(event.target as Node)
      ) {
        setShowParentEventList(false)
      }
      if (
        personSelectorRef.current &&
        !personSelectorRef.current.contains(event.target as Node)
      ) {
        setShowPersonList(false)
      }
      if (
        relatedEventSelectorRef.current &&
        !relatedEventSelectorRef.current.contains(event.target as Node)
      ) {
        setShowRelatedEventList(false)
      }
    }

    if (showParentEventList || showPersonList || showRelatedEventList) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showParentEventList, showPersonList, showRelatedEventList])

  return {
    // 부모 사건
    parentEventId,
    setParentEventId,
    parentEventSearch,
    setParentEventSearch,
    showParentEventList,
    setShowParentEventList,
    parentEventData,
    parentEventSelectorRef,
    filteredParentEvents,

    // 관련 인물
    relatedPersons,
    setRelatedPersons,
    personSearch,
    setPersonSearch,
    showPersonList,
    setShowPersonList,
    personSelectorRef,
    filteredPersons,

    // 관련 사건
    relatedEventIds,
    setRelatedEventIds,
    relatedEventSearch,
    setRelatedEventSearch,
    showRelatedEventList,
    setShowRelatedEventList,
    relatedEventSelectorRef,
    filteredRelatedEvents,
  }
}

