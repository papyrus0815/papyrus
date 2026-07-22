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

export const useEventHierarchy = (
  sortedEvents: HistoricalEvent[],
  events: HistoricalEvent[],
  showFlatView: boolean,
  sortBy: string = 'recent',
  sortDirection: 'asc' | 'desc' = 'desc',
) => {
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

    if (showFlatView) {
      const addAllEventsFlat = (
        node: EventHierarchyNode,
        parentEvent: HistoricalEvent | null,
      ) => {
        result.push({
          node,
          depth: 0, // 모든 사건을 depth 0으로
          parentEvent,
        })
        // 자식들도 재귀적으로 추가 (depth 0으로)
        if (node.children) {
          const childParentEvent =
            eventById.get(node.id) ?? parentEvent
          node.children.forEach((child) => {
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
      // 계층 뷰: 기존 로직
      const traverse = (
        node: EventHierarchyNode,
        depth: number,
        parentEvent: HistoricalEvent | null,
      ) => {
        result.push({ node, depth, parentEvent })

        // 펼쳐진 경우에만 자식 노드 추가
        if (expandedEventIds.has(node.id) && node.children) {
          const childParentEvent =
            eventById.get(node.id) ?? parentEvent

          // 하위 사건도 부모와 동일한 정렬 적용 (BC·미상 안전)
          const sortedChildren = [...node.children].sort((a, b) => {
            const comparison = compareNodes(
              a.period.start,
              a.period.end,
              b.period.start,
              b.period.end,
              sortBy,
            )
            return sortDirection === 'asc' ? comparison : -comparison
          })

          sortedChildren.forEach((child) => {
            traverse(child, depth + 1, childParentEvent)
          })
        }
      }

      sortedEvents.forEach((event) => {
        traverse(event.hierarchy, 0, event)
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
  ])

  return {
    expandedEventIds,
    setExpandedEventIds,
    toggleEventExpansion,
    flattenedHierarchy,
  }
}
