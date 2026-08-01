/**
 * Event Hierarchy Feature - Hierarchy Logic Hook
 * FSD: features/event-hierarchy/model
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { dateSortKey, isoYearSpan } from '@/shared/lib/iso-date'

import type {
  EventHierarchyNode,
  HistoricalEvent,
} from '../../../pages/events/create/events.types'

/**
 * flattenedHierarchy 단일 항목 — useEventHierarchy의 출력 계약.
 * grid/gallery/map/tree/dashboard/timeline 등 소비처가 각자 재선언하던 `FlatItem`을
 * 이 단일 타입으로 통일한다(계약 변경 시 한 곳만 고치면 됨).
 */
export interface FlattenedHierarchyItem {
  node: EventHierarchyNode
  depth: number
  parentEvent: HistoricalEvent | null
  /**
   * 이 사건 자체가 현재 필터를 만족하는가. 필터가 없으면 항상 true.
   * false = '매칭된 후손을 가진 부모'라서 문맥용으로만 남은 행 → 카운트에서 제외한다.
   */
  isMatch: boolean
  /**
   * 필터 때문에 이 행 아래에서 숨겨진 직계 자식 수. 0이면 숨긴 게 없다.
   * 행이 "조건 밖 N건"을 표시해, 자식이 조용히 사라진 것처럼 보이지 않게 한다.
   */
  hiddenChildCount: number
  /**
   * 이 행에서 펼치기/접기가 **실제로 동작하는가**.
   *
   * 자식 보유 여부(`node.children.length > 0`)와 다르다. 평면(계층 OFF) 모드는 모든
   * 자손을 depth 0으로 이미 나열하므로 펼칠 것이 남아 있지 않은데, 행은 자식 수만 보고
   * 셰브론과 aria-expanded를 그려 **눌러도 아무 일이 없는 죽은 컨트롤**이 됐다
   * (실측: flat 모드에서 '하위 사건 1개 펼치기' 클릭 → 행 수 239 → 239).
   * 렌더 계층이 모드를 추측하지 않도록 평탄화가 명시적으로 알려준다.
   */
  canExpand: boolean
  /**
   * 접힌 조상(부모/조부모) 아래에 있어 **목록에 렌더되지 않는** 행인가.
   *
   * 평탄화 결과는 목록 외에 타임라인·격자·지도·통계·트리·갤러리·JSON 내보내기가
   * 공유하므로, 접힘 때문에 항목을 배열에서 빼면 다른 화면의 데이터까지 사라진다.
   * 모집단은 항상 완전하게 두고 목록만 이 플래그로 걸러 낸다.
   */
  isCollapsedAway: boolean
}

/**
 * 노드 기간(period) 정렬 비교자 — 네이티브 Date 대신 정수 키/연 단위 기간을 써
 * BC(음수 연도)·미상 날짜를 안정 정렬한다. 미상은 NEGATIVE_INFINITY로 한쪽 끝에 모음.
 */
const compareNodes = (
  aStart: string,
  aEnd: string | undefined,
  bStart: string,
  bEnd: string | undefined,
  sortBy: string,
): number => {
  if (sortBy === 'duration') {
    return isoYearSpan(aStart, aEnd) - isoYearSpan(bStart, bEnd)
  }
  return (
    (dateSortKey(aStart) ?? Number.NEGATIVE_INFINITY) -
    (dateSortKey(bStart) ?? Number.NEGATIVE_INFINITY)
  )
}

interface HierarchyFilterOptions {
  /** 단일 사건이 현재 필터를 만족하는가 (useEventFilters.matchesEvent) */
  matchesEvent?: (event: HistoricalEvent) => boolean
  /** 내용을 좁히는 필터가 하나라도 걸려 있는가 — false면 자식 필터링 자체를 건너뛴다 */
  hasNarrowingFilters?: boolean
}

export const useEventHierarchy = (
  sortedEvents: HistoricalEvent[],
  events: HistoricalEvent[],
  showFlatView: boolean,
  sortBy: string = 'recent',
  sortDirection: 'asc' | 'desc' = 'desc',
  filterOptions: HierarchyFilterOptions = {},
) => {
  const { matchesEvent, hasNarrowingFilters = false } = filterOptions
  const [expandedEventIds, setExpandedEventIds] = useState<Set<string>>(
    new Set(),
  )

  // 자식 보유 사건을 자동 펼침 — 단, *신규* 부모만 기존 Set에 증분 추가한다.
  // 이전엔 sortedEvents가 바뀔 때마다 전체 Set을 재생성·교체해, 자동 로드 중 페이지마다
  // setState→flatten 재실행이 연쇄됐고 사용자의 수동 접기도 매번 덮어썼다.
  const autoExpandedRef = useRef<Set<string>>(new Set())
  useEffect(() => {
    const newlyExpandable: string[] = []
    for (const event of sortedEvents) {
      if (
        event.hierarchy.children &&
        event.hierarchy.children.length > 0 &&
        !autoExpandedRef.current.has(event.id)
      ) {
        newlyExpandable.push(event.id)
      }
    }
    if (newlyExpandable.length === 0) return // 신규 없음 → setState 생략
    newlyExpandable.forEach((id) => autoExpandedRef.current.add(id))
    setExpandedEventIds((prev) => {
      const next = new Set(prev)
      newlyExpandable.forEach((id) => next.add(id))
      return next
    })
  }, [sortedEvents])

  // 안정 참조 — CompactList → EventListItem으로 그대로 내려가 React.memo가 실효.
  const toggleEventExpansion = useCallback((eventId: string) => {
    setExpandedEventIds((prev) => {
      const next = new Set(prev)
      if (next.has(eventId)) {
        next.delete(eventId)
      } else {
        next.add(eventId)
      }
      return next
    })
  }, [])

  // hierarchy를 flatten하여 리스트로 만들기
  const flattenedHierarchy = useMemo(() => {
    const result: FlattenedHierarchyItem[] = []
    // 자식 노드의 부모 이벤트 조회를 O(1)로. 이전엔 노드마다 events.find(O(N))라
    // 자동 전체 펼침(모든 부모 펼침)과 곱해져 대규모에서 O(자식수 × N)였다.
    const eventById = new Map(events.map((event) => [event.id, event]))

    /**
     * 필터가 걸린 동안 자식에도 같은 조건을 적용한다.
     *
     * 필터는 '어떤 루트를 보여줄지'만 정하고 '무엇을 렌더할지'는 통제하지 못했다 —
     * 매칭된 부모의 자식은 카테고리·검색어·세기와 무관하게 전부 나왔고 카운트에도
     * 들어갔다(검토 TF-8/DATA-6). 자기 또는 후손이 매칭될 때만 자식을 남긴다.
     */
    const filteringActive = hasNarrowingFilters && !!matchesEvent
    const nodeMatches = (node: EventHierarchyNode): boolean => {
      if (!filteringActive) return true
      const event = eventById.get(node.id)
      return event ? matchesEvent(event) : false
    }
    const keepsNode = (node: EventHierarchyNode): boolean => {
      if (!filteringActive) return true
      if (nodeMatches(node)) return true
      return (node.children ?? []).some(keepsNode)
    }
    /** 필터로 잘려나간 직계 자식 수 */
    const hiddenCountOf = (node: EventHierarchyNode): number => {
      if (!filteringActive || !node.children) return 0
      return node.children.filter((child) => !keepsNode(child)).length
    }

    if (showFlatView) {
      const addAllEventsFlat = (
        node: EventHierarchyNode,
        parentEvent: HistoricalEvent | null,
      ) => {
        result.push({
          node,
          depth: 0, // 모든 사건을 depth 0으로
          parentEvent,
          isMatch: nodeMatches(node),
          // 평면 모드는 계층을 보여주지 않으므로 '숨긴 자식'을 알릴 자리가 없다.
          hiddenChildCount: 0,
          // 자손이 이미 같은 목록에 평면으로 나열돼 있어 펼칠 것이 없다.
          canExpand: false,
          // 평면 모드는 접기 개념이 없다 — 전부 렌더된다.
          isCollapsedAway: false,
        })
        // 자식들도 재귀적으로 추가 (depth 0으로)
        if (node.children) {
          const childParentEvent =
            eventById.get(node.id) ?? parentEvent
          node.children.filter(keepsNode).forEach((child) => {
            addAllEventsFlat(child, childParentEvent)
          })
        }
      }

      sortedEvents.forEach((event) => {
        addAllEventsFlat(event.hierarchy, event)
      })

      // 평면 모드에서는 정렬 기준에 따라 재정렬 (BC·미상 안전)
      result.sort((a, b) => {
        const comparison = compareNodes(
          a.node.period.start,
          a.node.period.end,
          b.node.period.start,
          b.node.period.end,
          sortBy,
        )
        return sortDirection === 'asc' ? comparison : -comparison
      })
    } else {
      /**
       * 계층 뷰.
       *
       * ⚠️ 접힘 여부와 무관하게 **모든 자손을 방출**하고, 접힌 조상 아래인지를
       * `isCollapsedAway` 플래그로만 표시한다.
       *
       * 예전엔 `expandedEventIds`에 없는 부모의 자식을 아예 traverse하지 않았다. 그런데
       * 이 배열은 목록만 쓰는 게 아니라 **타임라인·격자·지도·통계·트리·갤러리와
       * JSON 내보내기가 전부 같은 것을 받는다**. 그래서 목록에서 부모 하나를 접으면
       * 다른 뷰의 막대와 내보내기 결과에서 그 자손이 통째로 사라졌다 — 지역 표시 조작이
       * 다른 화면의 데이터를 삭제한 셈이다(검토 CR-1).
       * 이제 접힘은 '렌더 시점 skip'으로만 작용하고 모집단은 항상 완전하다.
       */
      const traverse = (
        node: EventHierarchyNode,
        depth: number,
        parentEvent: HistoricalEvent | null,
        collapsedAway: boolean,
      ) => {
        result.push({
          node,
          depth,
          parentEvent,
          isMatch: nodeMatches(node),
          hiddenChildCount: hiddenCountOf(node),
          canExpand: (node.children?.length ?? 0) > 0,
          isCollapsedAway: collapsedAway,
        })

        if (node.children) {
          const childParentEvent =
            eventById.get(node.id) ?? parentEvent
          // 이 노드가 접혀 있으면 그 아래는 전부 '접힘으로 숨김'. 조상 중 하나라도
          // 접혀 있으면 계속 전파된다.
          const childrenCollapsedAway =
            collapsedAway || !expandedEventIds.has(node.id)

          // 하위 사건도 부모와 동일한 정렬 적용 (BC·미상 안전)
          const sortedChildren = [...node.children]
            .filter(keepsNode)
            .sort((left, right) => {
              const comparison = compareNodes(
                left.period.start,
                left.period.end,
                right.period.start,
                right.period.end,
                sortBy,
              )
              return sortDirection === 'asc' ? comparison : -comparison
            })

          sortedChildren.forEach((child) => {
            traverse(child, depth + 1, childParentEvent, childrenCollapsedAway)
          })
        }
      }

      sortedEvents.forEach((event) => {
        traverse(event.hierarchy, 0, event, false)
      })
    }

    return result
  }, [
    sortedEvents,
    expandedEventIds,
    events,
    showFlatView,
    sortBy,
    sortDirection,
    matchesEvent,
    hasNarrowingFilters,
  ])

  /**
   * 필터를 실제로 만족하는 사건 수 — 문맥용으로만 남은 부모 행은 제외한다.
   * 화면의 '표시 N건'이 조건과 무관한 행까지 세던 오염을 막는다.
   */
  const matchedCount = useMemo(
    () =>
      flattenedHierarchy.filter((item) => item.isMatch && !item.isCollapsedAway)
        .length,
    [flattenedHierarchy],
  )

  return {
    expandedEventIds,
    setExpandedEventIds,
    toggleEventExpansion,
    flattenedHierarchy,
    matchedCount,
  }
}
