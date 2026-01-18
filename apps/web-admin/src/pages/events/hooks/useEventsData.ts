/**
 * useEventsData Hook
 * 이벤트 데이터 페칭 및 변환 로직
 */
import { useEffect, useState } from 'react'

import { getAllEvents } from '@/shared/api/events'

import type {
  HistoricalEvent,
  HistoricalEventCategory,
} from '../create/events.types'

/**
 * 카테고리 매핑 (DB의 한글 카테고리명 -> 영문 타입)
 */
const CATEGORY_MAP: Record<string, HistoricalEventCategory> = {
  정치: 'political',
  경제: 'economic',
  '전쟁/군사': 'military',
  사회: 'social',
  '과학/기술': 'technological',
  과학기술: 'technological',
  문화: 'cultural',
  외교: 'diplomatic',
  회담: 'conference',
  종교: 'religious',
  기타: 'other',
}

/**
 * API 응답을 HistoricalEvent로 변환
 */
function convertToHistoricalEvent(event: any): HistoricalEvent {
  const category = event.category?.name
    ? CATEGORY_MAP[event.category.name] || 'other'
    : 'other'

  return {
    id: event.id,
    title: event.title,
    type: 'battle' as const,
    category,
    description: event.description || '',
    startDate: event.startDate || new Date().toISOString(),
    endDate: event.endDate,
    location: event.location,
    tags: [],
    background: event.background || '',
    aftermath: event.aftermath || '',
    stats: {
      casualties: {
        total: 0,
        civilians: 0,
        military: 0,
      },
      participatingNations: 0,
      theaters: 0,
      durationInYears: 0,
    },
    hierarchy: {
      id: event.id,
      title: event.title,
      summary: event.description || '',
      period: {
        start: event.startDate || new Date().toISOString(),
        end: event.endDate,
      },
      importance: 'notable' as const,
      children: event.childEvents?.map((child: any) => ({
        id: child.id,
        title: child.title,
        summary: child.description || '',
        period: {
          start: child.startDate || new Date().toISOString(),
          end: child.endDate,
        },
        importance: 'notable' as const,
      })),
    },
    timeline: [],
    theaters: [],
    keyFigures: [],
    countries: [],
    influence: [],
    visuals: {
      heroImageUrl: event.thumbnail
        ? event.thumbnail.startsWith('http')
          ? event.thumbnail
          : `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'}${event.thumbnail}`
        : '',
      thumbnailUrl: event.thumbnail
        ? event.thumbnail.startsWith('http')
          ? event.thumbnail
          : `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'}${event.thumbnail}`
        : '',
      gallery: [],
    },
    map: {
      summary: '',
      markers: [],
    },
    quickFacts: {
      commandStructure: '',
      decisiveTechnology: '',
      intelligenceNotes: '',
      logisticalScale: '',
    },
    sectionTitles: event.sectionTitles || [],
  }
}

export function useEventsData() {
  const [events, setEvents] = useState<HistoricalEvent[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    const fetchEvents = async () => {
      setIsLoading(true)
      setError(null)

      try {
        const response = await getAllEvents()
        console.log('📦 API 응답 (전체):', response)
        console.log('📦 첫 번째 이벤트 상세:', response[0])

        const allEvents: HistoricalEvent[] = []

        response
          // ✅ 최상위 이벤트만 필터링 (parentEventId가 없는 것만)
          .filter((event) => !event.parentEventId)
          .forEach((event) => {
            // 디버깅: 카테고리 정보 확인
            console.log(
              '🔍 Event:',
              event.title,
              'Category 객체:',
              event.category,
              'Category ID:',
              event.categoryId,
              'Parent:',
              event.parentEventId,
            )

            const category = event.category?.name
              ? CATEGORY_MAP[event.category.name] || 'other'
              : 'other'

            console.log(
              '✅ Mapped category for',
              event.title,
              ':',
              category,
              '(from:',
              event.category?.name,
              ')',
            )

            // 부모 이벤트 추가
            const parentEventData = convertToHistoricalEvent(event)
            allEvents.push(parentEventData)

            // 자식 이벤트들도 추가
            if (event.childEvents && event.childEvents.length > 0) {
              event.childEvents.forEach((child: any) => {
                const childEventData = convertToHistoricalEvent(child)
                allEvents.push(childEventData)
              })
            }
          })

        setEvents(allEvents)
      } catch (err) {
        console.error('Failed to fetch events:', err)
        setError(err instanceof Error ? err : new Error('Unknown error'))
        setEvents([])
      } finally {
        setIsLoading(false)
      }
    }

    fetchEvents()
  }, [])

  return { events, isLoading, error }
}
