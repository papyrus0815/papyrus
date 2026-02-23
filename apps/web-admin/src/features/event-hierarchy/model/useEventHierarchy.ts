/**
 * Event Hierarchy Feature - Hierarchy Logic Hook
 * FSD: features/event-hierarchy/model
 */
import { useEffect, useMemo, useState } from 'react'

import type {
  EventHierarchyNode,
  HistoricalEvent,
} from '../../../pages/events/create/events.types'

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

  // sortedEvents가 변경될 때마다 하위 사건 있는 항목들을 자동으로 펼침
  useEffect(() => {
    const ids = new Set<string>()
    sortedEvents.forEach((event) => {
      if (event.hierarchy.children && event.hierarchy.children.length > 0) {
        ids.add(event.id)
      }
    })
    if (ids.size > 0) {
      setExpandedEventIds(ids)
    }
  }, [sortedEvents])

  const toggleEventExpansion = (eventId: string) => {
    setExpandedEventIds((prev) => {
      const next = new Set(prev)
      if (next.has(eventId)) {
        next.delete(eventId)
      } else {
        next.add(eventId)
      }
      return next
    })
  }

  // hierarchy를 flatten하여 리스트로 만들기
  const flattenedHierarchy = useMemo(() => {
    const result: Array<{
      node: EventHierarchyNode
      depth: number
      parentEvent: HistoricalEvent | null
    }> = []

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
            events.find((e) => e.id === node.id) ?? parentEvent
          node.children.forEach((child) => {
            addAllEventsFlat(child, childParentEvent)
          })
        }
      }

      sortedEvents.forEach((event) => {
        addAllEventsFlat(event.hierarchy, event)
      })

      // 평면 모드에서는 정렬 기준에 따라 재정렬
      result.sort((a, b) => {
        let comparison = 0

        if (sortBy === 'duration') {
          // 기간순 정렬 (끝-시작 차이)
          const durationA = a.node.period.end
            ? new Date(a.node.period.end).getTime() -
              new Date(a.node.period.start).getTime()
            : 0
          const durationB = b.node.period.end
            ? new Date(b.node.period.end).getTime() -
              new Date(b.node.period.start).getTime()
            : 0
          comparison = durationA - durationB
        } else {
          // 최근순 정렬 (기본)
          const dateA = new Date(a.node.period.start).getTime()
          const dateB = new Date(b.node.period.start).getTime()
          comparison = dateA - dateB
        }

        // 방향 적용
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
            events.find((e) => e.id === node.id) ?? parentEvent

          // 하위 사건도 부모와 동일한 정렬 적용
          const sortedChildren = [...node.children].sort((a, b) => {
            let comparison = 0

            if (sortBy === 'duration') {
              const durationA = a.period.end
                ? new Date(a.period.end).getTime() -
                  new Date(a.period.start).getTime()
                : 0
              const durationB = b.period.end
                ? new Date(b.period.end).getTime() -
                  new Date(b.period.start).getTime()
                : 0
              comparison = durationA - durationB
            } else {
              // 최근순 (기본): 시작일 기준
              const dateA = new Date(a.period.start).getTime()
              const dateB = new Date(b.period.start).getTime()
              comparison = dateA - dateB
            }

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
