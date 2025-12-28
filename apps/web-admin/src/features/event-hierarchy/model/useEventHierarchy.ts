/**
 * Event Hierarchy Feature - Hierarchy Logic Hook
 * FSD: features/event-hierarchy/model
 */

import { useMemo, useState } from 'react'

import type {
  EventHierarchyNode,
  HistoricalEvent,
} from '../../../pages/events/create/events.types'

export const useEventHierarchy = (
  sortedEvents: HistoricalEvent[],
  events: HistoricalEvent[],
  showFlatView: boolean,
) => {
  const [expandedEventIds, setExpandedEventIds] = useState<Set<string>>(
    new Set(),
  )

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
      // 플랫 뷰: 모든 사건을 depth 0으로 평평하게 표시
      events.forEach((event) => {
        result.push({
          node: event.hierarchy,
          depth: 0,
          parentEvent: event,
        })
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
          node.children.forEach((child) => {
            traverse(child, depth + 1, childParentEvent)
          })
        }
      }

      sortedEvents.forEach((event) => {
        traverse(event.hierarchy, 0, event)
      })
    }

    return result
  }, [sortedEvents, expandedEventIds, events, showFlatView])

  return {
    expandedEventIds,
    setExpandedEventIds,
    toggleEventExpansion,
    flattenedHierarchy,
  }
}

