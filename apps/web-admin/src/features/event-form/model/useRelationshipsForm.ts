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

  // 추가 상위 사건 (EventParentLink) — 주 상위(parentEventId) 지정 시에만 유효
  const [extraParentEventIds, setExtraParentEventIds] = useState<string[]>([])

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

  // 추가 상위 정합 게이트 — 주 상위 해제 시 추가 상위도 무효(INV-2),
  // 주 상위로 승격된 사건이 추가 상위에 남으면 중복(INV-1)이라 상태 차원에서 차단.
  useEffect(() => {
    if (!parentEventId) {
      setExtraParentEventIds((prev) => (prev.length ? [] : prev))
      return
    }
    setExtraParentEventIds((prev) =>
      prev.includes(parentEventId)
        ? prev.filter((id) => id !== parentEventId)
        : prev,
    )
  }, [parentEventId])

  // 부모 사건 데이터 로드
  useEffect(() => {
    if (parentEventId) {
      const selectedEvent = availableEvents.find((e) => e.id === parentEventId)
      if (selectedEvent && parentEventSearch !== selectedEvent.title) {
        setParentEventSearch(selectedEvent.title)
      }

      getEventById(parentEventId)
        .then(setParentEventData)
        .catch(() => setParentEventData(null))
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
    }

    if (showParentEventList || showPersonList) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showParentEventList, showPersonList])

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

    // 추가 상위 사건
    extraParentEventIds,
    setExtraParentEventIds,
  }
}

