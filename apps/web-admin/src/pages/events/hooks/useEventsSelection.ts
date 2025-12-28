/**
 * useEventsSelection Hook
 * 이벤트 선택 및 확장 상태 관리
 */
import { useMemo, useState } from 'react'

import type {
  EventHierarchyNode,
  HistoricalEvent,
} from '../create/events.types'

export function useEventsSelection(
  events: HistoricalEvent[],
  sortedEvents: HistoricalEvent[],
) {
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null)
  const [expandedEventIds, setExpandedEventIds] = useState<Set<string>>(
    new Set(),
  )

  // 이벤트 확장/축소 토글
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

  // 선택된 이벤트 정보
  const selectedEvent = useMemo(() => {
    if (!selectedEventId) return null

    // 먼저 events에서 직접 찾기
    const directEvent = events.find((event) => event.id === selectedEventId)
    if (directEvent) return directEvent

    // hierarchy에서 찾기
    const findInHierarchy = (
      node: EventHierarchyNode,
      parentEvent: HistoricalEvent,
    ): HistoricalEvent | null => {
      if (node.id === selectedEventId) return parentEvent
      if (node.children) {
        for (const child of node.children) {
          const found = findInHierarchy(child, parentEvent)
          if (found) return found
        }
      }
      return null
    }

    for (const event of events) {
      const found = findInHierarchy(event.hierarchy, event)
      if (found) return found
    }

    return null
  }, [selectedEventId, events])

  // 선택된 노드 정보
  const selectedNode = useMemo(() => {
    if (!selectedEventId) return null

    const findNode = (node: EventHierarchyNode): EventHierarchyNode | null => {
      if (node.id === selectedEventId) return node
      if (node.children) {
        for (const child of node.children) {
          const found = findNode(child)
          if (found) return found
        }
      }
      return null
    }

    for (const event of events) {
      const found = findNode(event.hierarchy)
      if (found) return found
    }

    return null
  }, [selectedEventId, events])

  // 평탄화된 계층 구조 (리스트 렌더링용)
  const flattenedHierarchy = useMemo(() => {
    const result: Array<{
      node: EventHierarchyNode
      depth: number
      parentEvent: HistoricalEvent | null
    }> = []

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

    return result
  }, [sortedEvents, expandedEventIds, events])

  return {
    selectedEventId,
    setSelectedEventId,
    expandedEventIds,
    setExpandedEventIds,
    toggleEventExpansion,
    selectedEvent,
    selectedNode,
    flattenedHierarchy,
  }
}
