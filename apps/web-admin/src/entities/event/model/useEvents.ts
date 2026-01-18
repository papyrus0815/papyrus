/**
 * Event Entity - Data Loading Hook
 * FSD: entities/event/model
 */

import { useEffect, useState } from 'react'

import { getAllEvents } from '@/shared/api/events'
import { getAllPersonsWithGovernmentPositions } from '@/shared/api/persons'

import { MOCK_PERSONS_WITH_GOVERNMENT_POSITIONS } from '../../../pages/events/list/mock-government-positions'
import type { HistoricalEvent } from '../../../pages/events/create/events.types'
import { transformEventsFromApi } from './eventTransformers'

export const useEvents = () => {
  const [events, setEvents] = useState<HistoricalEvent[]>([])
  const [personsWithGovPositions, setPersonsWithGovPositions] = useState<
    typeof MOCK_PERSONS_WITH_GOVERNMENT_POSITIONS
  >([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchEvents = async () => {
      setIsLoading(true)
      try {
        // 🎭 목업 데이터 사용 여부 (true로 설정하면 목업 데이터 사용)
        const USE_MOCK_DATA = false // ✅ 실제 API 사용으로 변경

        let eventsResponse: Awaited<ReturnType<typeof getAllEvents>>
        let personsResponse: typeof MOCK_PERSONS_WITH_GOVERNMENT_POSITIONS

        // ✅ Events는 실제 API, Persons는 목업 데이터 사용
        eventsResponse = await getAllEvents()
        personsResponse = MOCK_PERSONS_WITH_GOVERNMENT_POSITIONS
        console.log('✅ Events: API 사용, Persons: 목업 데이터 사용')

        console.log('📦 API 응답 (전체):', eventsResponse)
        console.log('📦 첫 번째 이벤트 상세:', eventsResponse[0])
        console.log('👥 인물 정부 직책 데이터:', personsResponse)

        const allEvents = transformEventsFromApi(eventsResponse)

        setEvents(allEvents)
        setPersonsWithGovPositions(personsResponse)
      } catch (error) {
        console.error('Failed to fetch events:', error)
        setEvents([])
      } finally {
        setIsLoading(false)
      }
    }

    fetchEvents()
  }, [])

  return {
    events,
    personsWithGovPositions,
    isLoading,
  }
}

