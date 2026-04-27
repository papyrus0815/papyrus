/**
 * 삭제된 사건 로드.
 *
 * 백엔드 EventResponseDto에는 HistoricalEvent의 일부 필드(hierarchy, countries 등)가
 * 없을 수 있어 기본값으로 채워 안전하게 매핑.
 *
 * 카운트 배지(탭 이름 옆)는 항상 표시되므로 마운트 시 1회 fetch.
 * activeTab이 'deleted'로 바뀌면 다시 fetch해 최신화.
 */
import { useCallback, useEffect, useState } from 'react'

import { getDeletedEvents } from '@/shared/api/events'

import type {
  EventHierarchyNode,
  HistoricalEvent,
} from '../../create/events.types'

export function useDeletedEvents(activeTab: 'active' | 'deleted') {
  const [deletedEvents, setDeletedEvents] = useState<HistoricalEvent[]>([])
  const [deletedCount, setDeletedCount] = useState(0)

  const mapDeletedEvent = useCallback((raw: unknown): HistoricalEvent => {
    const e = raw as Partial<HistoricalEvent> & Record<string, unknown>
    const placeholderHierarchy = {
      id: (e.id as string) ?? '',
      title: (e.title as string) ?? '',
      period: {
        start: (e.startDate as string) ?? null,
        end: (e.endDate as string) ?? null,
      },
      children: [],
    } as unknown as EventHierarchyNode
    return {
      ...(e as HistoricalEvent),
      hierarchy: (e.hierarchy as EventHierarchyNode) ?? placeholderHierarchy,
      countries: (e.countries as HistoricalEvent['countries']) ?? [],
      category: (e.category as HistoricalEvent['category']) ?? '',
    } as HistoricalEvent
  }, [])

  useEffect(() => {
    let cancelled = false
    getDeletedEvents()
      .then((evts) => {
        if (cancelled) return
        const mapped = evts.map(mapDeletedEvent)
        setDeletedEvents(mapped)
        setDeletedCount(mapped.length)
      })
      .catch(() => {
        if (cancelled) return
        setDeletedEvents([])
        setDeletedCount(0)
      })
    return () => {
      cancelled = true
    }
  }, [activeTab, mapDeletedEvent])

  return { deletedEvents, deletedCount }
}
