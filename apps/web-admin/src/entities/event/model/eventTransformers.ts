/**
 * Event Entity - Data Transformers
 * FSD: entities/event/model
 *
 * 리스트 단계에서는 응답에 실제로 실려온 깊이만큼 hierarchy를 재귀로 만든다.
 * 서버(getAllEvents)가 root→자식→손자(depth 3)까지 nested include하므로, 트리 뷰의
 * "모두 펼치기"·목록의 다단 펼침이 손자까지 도달한다. 응답에 없는 더 깊은 계층은
 * 자연히 종단(childMap 미적중 → children:[]).
 *
 * childMap은 eventMap(재귀 인덱싱)에서 parentEventId 역참조 + childEvents 직참조의
 * 합집합으로 만들어 모든 계층의 부모→자식 관계를 담는다. 순환 방어를 위해 경로상
 * 방문 id 집합을 내려 이미 방문한 노드는 자식을 비운다.
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

  // 3️⃣ 재귀 hierarchy 노드 빌더 — 응답에 실려온 계층만큼 children을 채운다.
  // seen: 현재 경로의 방문 id 집합(순환 방어). 방문한 노드는 children을 비워 무한재귀 차단.
  const buildHierarchy = (
    evt: EventResponse,
    seen: Set<string>,
  ): EventHierarchyNode => {
    const kids = seen.has(evt.id) ? [] : childMap.get(evt.id) ?? []
    const nextSeen = new Set(seen).add(evt.id)
    return {
      id: evt.id,
      title: evt.title,
      summary: evt.description ?? '',
      period: {
        start: evt.startDate ?? '',
        end: evt.endDate ?? undefined,
      },
      importance: 'notable' as const,
      children: kids.map((child) => buildHierarchy(child, nextSeen)),
    }
  }

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
      startDate: evt.startDate ?? '',
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
      hierarchy: buildHierarchy(evt, new Set<string>()),
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
