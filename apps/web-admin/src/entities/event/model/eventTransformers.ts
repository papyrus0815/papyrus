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
        // 정밀도를 노드에 실어야 노드만 받는 소비처(요약 모달 트리·트리 뷰)도
        // formatDateRange에 정밀도를 넘길 수 있다. 없으면 기본 'day'로 동작해
        // 연도만 아는 사건에 없는 월·일을 지어낸다(2026-07-28 검토 DATA-3).
        startPrecision: evt.startDatePrecision ?? undefined,
        endPrecision: evt.endDatePrecision ?? undefined,
      },
      /**
       * ⚠️ 자리표시자 — Event 스키마·응답 DTO 어디에도 importance 필드가 없다.
       * 이 값을 신호로 쓰던 표시(목록 별·헤더 KPI·대시보드 티어 카드·트리 배지)는
       * 2026-07-28 검토(M9)에서 전부 제거했다. 남은 소비처는 타임라인 내부
       * 라벨 우선순위뿐이며, 실제 필드를 도입하기 전까지는 균일값이다.
       */
      importance: 'notable' as const,
      children: kids.map((child) => buildHierarchy(child, nextSeen)),
    }
  }

  const convertToHistoricalEvent = (evt: EventResponse): HistoricalEvent => {
    // category — DB의 한국어 이름을 1차 식별자로(렌더·필터 일관성 ↑).
    // 안정 매칭 필요한 곳(칩 등)은 categoryId 사용.
    //
    // 미지정 사건에 가짜 id('cat-other-001')를 채우지 않는다 — DB의 '기타'
    // 카테고리는 uuid를 가진 별개 행이라, 가짜 id는 '기타' 필터(정확 일치 비교)에
    // 절대 걸리지 않으면서 화면에는 '기타'로 보여 분류된 것처럼 위장했다.
    // 이제 id는 비우고 라벨만 '미분류'로 파생한다(2026-07-28 검토 DATA-13).
    const evtCategoryId = evt.category?.id ?? ''
    const evtCategoryName = evt.category?.name ?? '미분류'
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
      // 서버는 정밀도를 항상 실어 보내지만 여기서 매핑이 빠져 있어 런타임엔 늘
      // undefined였다(타입엔 선언돼 있어 tsc가 못 잡음). 그 탓에 목록 행의
      // precision 가드가 죽고 연·월 정밀도 사건에 가짜 '월.일'이 찍혔다.
      startDatePrecision: evt.startDatePrecision ?? undefined,
      endDatePrecision: evt.endDatePrecision ?? undefined,
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
      /**
       * 앵커 오버라이드 — **여기서 빠뜨리면 서버가 보내도 프론트에서 소멸한다.**
       * `extraParentCount`가 정확히 그렇게 죽어 있었다(응답에 실려 오는데 매핑 누락).
       * 타입에는 선언돼 있어 tsc가 잡아 주지 않는 종류의 결함이라 주석으로 못박는다.
       */
      anchorOverride: evt.anchorOverride ?? null,
      // 같은 사고의 원본 — 서버 `_count.extraParentLinks`가 실려 오는데 매핑이 없어
      // 런타임엔 늘 undefined였다. '미로드'와 '0개'를 구분해야 하므로 ?? 0 금지.
      extraParentCount: (evt as { extraParentCount?: number }).extraParentCount,
      sectionTitles: evt.sectionTitles ?? [],
      eventSections: evt.eventSections,
      eventImages: evt.eventImages,
      relatedCountries: evt.relatedCountries,
      relatedHistoricalCountries: evt.relatedHistoricalCountries,
      keywords: evt.keywords ?? undefined,
      /**
       * 등록 시각 — '등록순' 정렬(SORT_OPTIONS.CREATED)의 유일한 근거다.
       * 서버 응답에는 원래 실려 오는데 여기서 매핑되지 않아, 목록에서 등록 축으로
       * 정렬할 방법 자체가 없었다(검토 CR-4). 매핑하지 않으면 정렬이 조용한 no-op이 된다.
       */
      createdAt: (evt as { createdAt?: string | null }).createdAt ?? undefined,
    }
  }

  // 4️⃣ 평탄 변환 — 부모·자식 모두 같은 배열에 단 한 번씩 들어간다.
  return Array.from(eventMap.values()).map(convertToHistoricalEvent)
}
