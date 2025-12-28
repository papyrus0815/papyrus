/**
 * Event Entity - Data Transformers
 * FSD: entities/event/model
 */

import { extractCategoryKey } from '@/features/event-create/lib'
import { getAllEvents } from '@/shared/api/events'

import type {
  EventHierarchyNode,
  HistoricalEvent,
  HistoricalEventCategory,
} from '../../../pages/events/create/events.types'

type EventResponse = Awaited<ReturnType<typeof getAllEvents>>[0]

/**
 * API 응답을 HistoricalEvent 배열로 변환
 */
export const transformEventsFromApi = (
  response: EventResponse[],
): HistoricalEvent[] => {
  const allEvents: HistoricalEvent[] = []

  // 1️⃣ 먼저 모든 이벤트를 Map으로 인덱싱 (빠른 조회를 위해)
  const eventMap = new Map<string, EventResponse>()
  response.forEach((event: EventResponse) => {
    eventMap.set(event.id, event)
  })

  // 2️⃣ 재귀적으로 전체 트리를 구축하는 함수 (API 응답 기반)
  const buildFullHierarchy = (eventId: string): EventResponse | null => {
    const event = eventMap.get(eventId)
    if (!event) return null

    // 자식 이벤트 ID 수집: childEvents + parentEventId로 연결된 모든 자식
    const childIds = new Set<string>()

    // childEvents에서 ID 수집
    if (event.childEvents) {
      event.childEvents.forEach((child: EventResponse) =>
        childIds.add(child.id),
      )
    }

    // parentEventId가 현재 이벤트를 가리키는 모든 이벤트 찾기
    response.forEach((evt: EventResponse) => {
      if (evt.parentEventId === eventId) {
        childIds.add(evt.id)
      }
    })

    // 재귀적으로 자식들의 전체 트리 구축
    const fullChildEvents = Array.from(childIds)
      .map((childId) => buildFullHierarchy(childId))
      .filter((child): child is NonNullable<typeof child> => child !== null)

    return {
      ...event,
      childEvents: fullChildEvents.length > 0 ? fullChildEvents : undefined,
    }
  }

  // 재귀적으로 hierarchy를 구축하는 헬퍼 함수
  const buildHierarchy = (evt: EventResponse): EventHierarchyNode => {
    return {
      id: evt.id,
      title: evt.title,
      summary: evt.description || '',
      period: {
        start: evt.startDate || new Date().toISOString(),
        end: evt.endDate === null ? undefined : evt.endDate,
      },
      importance: 'notable' as const,
      // 재귀적으로 자식의 자식까지 모두 처리
      children: evt.childEvents?.map((child) => buildHierarchy(child)),
    }
  }

  // 이벤트를 HistoricalEvent로 변환하는 헬퍼 함수
  const convertToHistoricalEvent = (
    evt: EventResponse,
    isChild: boolean = false,
  ): HistoricalEvent => {
    // ===== FSD: 카테고리 ID 사용 =====
    const evtCategoryId = evt.category?.id || 'cat-other-001'
    const evtCategoryKey = extractCategoryKey(evtCategoryId)

    return {
      id: evt.id,
      title: evt.title,
      type: 'battle' as const,
      category: evtCategoryKey as HistoricalEventCategory,
      description: evt.description || '',
      startDate: evt.startDate || new Date().toISOString(),
      endDate: evt.endDate || undefined,
      location: evt.location || undefined,
      tags: [],
      background: evt.background || '',
      aftermath: evt.aftermath || '',
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
      // 재귀적으로 전체 hierarchy 구축
      hierarchy: buildHierarchy(evt),
      timeline: [],
      theaters: [],
      keyFigures: [],
      countries: [],
      influence: [],
      visuals: {
        heroImageUrl: evt.thumbnail
          ? evt.thumbnail.startsWith('http')
            ? evt.thumbnail
            : `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'}${evt.thumbnail}`
          : '',
        thumbnailUrl: evt.thumbnail
          ? evt.thumbnail.startsWith('http')
            ? evt.thumbnail
            : `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'}${evt.thumbnail}`
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
      // 자식 여부 표시
      parentEventId: isChild ? evt.parentEventId || undefined : undefined,
    }
  }

  // 재귀적으로 모든 자식 이벤트를 수집하는 함수
  const collectAllDescendants = (
    evt: EventResponse,
    descendants: EventResponse[] = [],
  ): EventResponse[] => {
    if (evt.childEvents && evt.childEvents.length > 0) {
      evt.childEvents.forEach((child) => {
        descendants.push(child)
        // 재귀: 자식의 자식도 수집
        collectAllDescendants(child, descendants)
      })
    }
    return descendants
  }

  // 3️⃣ 최상위 이벤트만 필터링하여 처리
  response
    .filter((event: EventResponse) => !event.parentEventId)
    .forEach((event: EventResponse) => {
      // 전체 트리가 구축된 이벤트 가져오기
      const fullEvent = buildFullHierarchy(event.id)
      if (!fullEvent) return

      console.log(
        '🔍 Event:',
        fullEvent.title,
        'Category 객체:',
        fullEvent.category,
        'Category ID:',
        fullEvent.categoryId,
        'Parent:',
        fullEvent.parentEventId,
        'Children:',
        fullEvent.childEvents?.length || 0,
      )

      // ===== FSD: 카테고리 ID 직접 사용 =====
      const categoryId = fullEvent.category?.id || 'cat-other-001'
      const categoryKey = extractCategoryKey(categoryId)

      console.log(
        '✅ Category for',
        fullEvent.title,
        ':',
        categoryKey,
        '(ID:',
        categoryId,
        ', name:',
        fullEvent.category?.name,
        ')',
      )

      // ✅ 부모 이벤트 추가
      const parentEventData = convertToHistoricalEvent(fullEvent, false)
      allEvents.push(parentEventData)

      // ✅ 모든 하위 이벤트들을 재귀적으로 수집하여 추가
      const allDescendants = collectAllDescendants(fullEvent)
      allDescendants.forEach((descendant) => {
        const descendantData = convertToHistoricalEvent(descendant, true)
        allEvents.push(descendantData)
      })
    })

  return allEvents
}

