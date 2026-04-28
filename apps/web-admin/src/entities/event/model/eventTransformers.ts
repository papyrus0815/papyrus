/**
 * Event Entity - Data Transformers
 * FSD: entities/event/model
 *
 * 리스트 단계에서는 *얕은* hierarchy(직계 자식 1단)만 만든다. 이유:
 *  - 행 렌더에 필요한 건 childCount + 직계 자식 id/title/period뿐 (event-row,
 *    event-row-expansion, category-pivot의 importanceFromHierarchy).
 *  - 풀 트리는 detail 페이지에서 필요할 때만 별도 매퍼(event-detail.mapper)가 빌드.
 *
 * 이전 구현(O(n²) buildFullHierarchy + 재귀 buildHierarchy)을 평탄 1패스로 대체.
 */
import { getAllEvents } from '@/shared/api/events'

import type {
  EventHierarchyNode,
  HistoricalEvent,
  HistoricalEventCategory,
} from './types'

type EventResponse = Awaited<ReturnType<typeof getAllEvents>>[0]
type EventImageResponse = NonNullable<EventResponse['eventImages']>[number]

/**
 * API 응답을 평탄한 HistoricalEvent 배열로 변환.
 * 부모·자식이 모두 같은 배열에 들어간다(리스트 페이지는 평탄 뷰가 기본).
 */
export const transformEventsFromApi = (
  response: EventResponse[],
): HistoricalEvent[] => {
  // 1️⃣ 모든 이벤트 평탄화 (응답이 nested일 수 있어 재귀 인덱싱).
  const eventMap = new Map<string, EventResponse>()
  const indexEvent = (evt: EventResponse) => {
    eventMap.set(evt.id, evt)
    evt.childEvents?.forEach(indexEvent)
  }
  response.forEach(indexEvent)

  // 2️⃣ 직계 자식 맵 — parentEventId 역참조 + childEvents 직참조의 합집합(id 중복 제거).
  const childMap = new Map<string, EventResponse[]>()
  const addChild = (parentId: string, child: EventResponse) => {
    const list = childMap.get(parentId)
    if (list) {
      if (!list.some((existing) => existing.id === child.id)) list.push(child)
    } else {
      childMap.set(parentId, [child])
    }
  }
  for (const evt of eventMap.values()) {
    if (evt.parentEventId) addChild(evt.parentEventId, evt)
    evt.childEvents?.forEach((child: EventResponse) => addChild(evt.id, child))
  }

  // 3️⃣ 얕은 hierarchy 노드 빌더 — 자식의 자식은 비움(필요 시 detail에서 fetch).
  const buildShallowHierarchy = (evt: EventResponse): EventHierarchyNode => ({
    id: evt.id,
    title: evt.title,
    summary: evt.description ?? '',
    period: {
      start: evt.startDate ?? new Date().toISOString(),
      end: evt.endDate ?? undefined,
    },
    importance: 'notable' as const,
    children: (childMap.get(evt.id) ?? []).map((child) => ({
      id: child.id,
      title: child.title,
      summary: '',
      period: {
        start: child.startDate ?? '',
        end: child.endDate ?? undefined,
      },
      importance: 'notable' as const,
    })),
  })

  const convertToHistoricalEvent = (evt: EventResponse): HistoricalEvent => {
    // category — DB의 한국어 이름을 1차 식별자로(렌더·필터 일관성 ↑).
    // 안정 매칭 필요한 곳(칩 등)은 categoryId 사용.
    const evtCategoryId = evt.category?.id ?? 'cat-other-001'
    const evtCategoryName = evt.category?.name ?? '기타'
    const primaryImage =
      evt.thumbnail ||
      evt.eventImages?.find((img: EventImageResponse) => img.isPrimary)
        ?.imageUrl ||
      ''

    return {
      id: evt.id,
      title: evt.title,
      type: 'battle' as const,
      category: evtCategoryName as HistoricalEventCategory,
      categoryId: evtCategoryId,
      description: evt.description ?? '',
      startDate: evt.startDate ?? new Date().toISOString(),
      endDate: evt.endDate ?? undefined,
      location: evt.location ?? undefined,
      tags: [],
      background: evt.background ?? '',
      aftermath: evt.aftermath ?? '',
      stats: {
        casualties: { total: 0, civilians: 0, military: 0 },
        participatingNations: 0,
        theaters: 0,
        durationInYears: 0,
      },
      hierarchy: buildShallowHierarchy(evt),
      timeline: [],
      theaters: [],
      keyFigures: [],
      countries: [],
      influence: [],
      visuals: {
        heroImageUrl: primaryImage,
        thumbnailUrl: primaryImage,
        gallery:
          evt.eventImages?.map((img: EventImageResponse) => ({
            id: img.id,
            title: img.caption ?? '',
            url: img.imageUrl,
            caption: img.caption,
            source: img.source,
          })) ?? [],
      },
      map: { summary: '', markers: [] },
      quickFacts: {
        commandStructure: '',
        decisiveTechnology: '',
        intelligenceNotes: '',
        logisticalScale: '',
      },
      parentEventId: evt.parentEventId ?? undefined,
      sectionTitles: evt.sectionTitles ?? [],
      eventSections: evt.eventSections,
      eventImages: evt.eventImages,
      relatedCountries: evt.relatedCountries,
      relatedHistoricalCountries: evt.relatedHistoricalCountries,
      keywords: evt.keywords ?? undefined,
    }
  }

  // 4️⃣ 평탄 변환 — 부모·자식 모두 같은 배열에 단 한 번씩 들어간다.
  return Array.from(eventMap.values()).map(convertToHistoricalEvent)
}
