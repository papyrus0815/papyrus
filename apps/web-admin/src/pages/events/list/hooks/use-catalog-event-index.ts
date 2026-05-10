/**
 * 사건/하위 노드를 ID로 빠르게 찾기 위한 lookup map.
 *
 * - eventByIdMap: 루트 사건 id → event
 * - nodeIndexMap: 모든 hierarchy 노드 id → { node, rootEvent }
 *
 * 페이지의 selectedEvent/selectedNode/summaryNode 등 O(1) 조회를 받쳐준다.
 */
import { useMemo } from 'react'

import type {
  EventHierarchyNode,
  HistoricalEvent,
} from '../../create/events.types'

export interface CatalogEventIndex {
  eventByIdMap: Map<string, HistoricalEvent>
  nodeIndexMap: Map<
    string,
    { node: EventHierarchyNode; rootEvent: HistoricalEvent }
  >
}

export function useCatalogEventIndex(
  events: HistoricalEvent[],
): CatalogEventIndex {
  const eventByIdMap = useMemo(() => {
    const m = new Map<string, HistoricalEvent>()
    for (const e of events) m.set(e.id, e)
    return m
  }, [events])

  const nodeIndexMap = useMemo(() => {
    const m = new Map<
      string,
      { node: EventHierarchyNode; rootEvent: HistoricalEvent }
    >()
    const visit = (node: EventHierarchyNode, rootEvent: HistoricalEvent) => {
      m.set(node.id, { node, rootEvent })
      if (node.children) {
        for (const c of node.children) visit(c, rootEvent)
      }
    }
    for (const e of events) visit(e.hierarchy, e)
    return m
  }, [events])

  return { eventByIdMap, nodeIndexMap }
}
