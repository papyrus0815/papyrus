/**
 * Event Entity - Data Loading Hook
 * FSD: entities/event/model
 */
import { useEffect, useState } from 'react'

import { getAllEvents } from '@/shared/api/events'
import { getAllPersonsWithGovernmentPositions } from '@/shared/api/persons'

import type { HistoricalEvent } from '../../../pages/events/create/events.types'
import { MOCK_PERSONS_WITH_GOVERNMENT_POSITIONS } from '../../../pages/events/list/mock-government-positions'
import { transformEventsFromApi } from './eventTransformers'

export const useEvents = (pageSizeParam: number = 20) => {
  const [events, setEvents] = useState<HistoricalEvent[]>([])
  const [personsWithGovPositions, setPersonsWithGovPositions] = useState<
    typeof MOCK_PERSONS_WITH_GOVERNMENT_POSITIONS
  >([])
  const [isLoading, setIsLoading] = useState(true)
  const [hasMore, setHasMore] = useState(true)
  const [offset, setOffset] = useState(0)
  const [pageSize, setPageSize] = useState(pageSizeParam)

  const fetchMoreEvents = async (
    reset: boolean = false,
    customLimit?: number,
  ) => {
    if (!hasMore && !reset) return

    setIsLoading(true)
    const startTime = Date.now()

    try {
      const currentOffset = reset ? 0 : offset
      const limit = customLimit || pageSize

      console.log(`📥 사건 요청: offset=${currentOffset}, limit=${limit}`)

      const eventsResponse = await getAllEvents({
        offset: currentOffset,
        limit,
      })
      const personsResponse = MOCK_PERSONS_WITH_GOVERNMENT_POSITIONS

      console.log(`✅ ${eventsResponse.length}개 사건 수신`)

      const newEvents = transformEventsFromApi(eventsResponse)

      // 최소 2초 지연 보장
      const elapsed = Date.now() - startTime
      const minDelay = 2000
      if (elapsed < minDelay) {
        await new Promise((resolve) => setTimeout(resolve, minDelay - elapsed))
      }

      if (reset) {
        setEvents(newEvents)
        setOffset(eventsResponse.length)
      } else {
        setEvents((prev) => [...prev, ...newEvents])
        setOffset((prev) => prev + eventsResponse.length)
      }

      setHasMore(eventsResponse.length === limit)
      setPersonsWithGovPositions(personsResponse)
    } catch (error) {
      console.error('Failed to fetch events:', error)
      if (reset) {
        setEvents([])
      }
    } finally {
      setIsLoading(false)
    }
  }

  const resetAndFetch = (newPageSize: number) => {
    console.log(`🔄 페이지 크기 변경으로 리셋: ${newPageSize}개씩`)
    setPageSize(newPageSize)
    setOffset(0)
    setHasMore(true)
    fetchMoreEvents(true, newPageSize)
  }

  useEffect(() => {
    fetchMoreEvents(true)
  }, [])

  return {
    events,
    personsWithGovPositions,
    isLoading,
    hasMore,
    fetchMoreEvents: () => fetchMoreEvents(false),
    resetAndFetch,
  }
}
