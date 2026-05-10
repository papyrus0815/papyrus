import { useCallback, useEffect, useState } from 'react'

import { getEventById } from '@/shared/api/events'

export interface OverlayEvent {
  id: string
  title: string
  startDate: string
  endDate: string | null
  /** EventCategory.name (있으면) — 색 분기에 사용 */
  categoryName: string | null
  /** EventCategory.id — 사건 클릭 후 상세 진입 시 옵션 */
  categoryId: string | null
}

const STORAGE_KEY = 'heads-of-state-timeline:event-overlay:v1'

function readStorage(): string[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.filter((s) => typeof s === 'string') : []
  } catch {
    return []
  }
}
function writeStorage(ids: string[]) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(ids))
  } catch {
    // ignore
  }
}

/**
 * timeline 위에 회색 띠로 표시할 사건 모음 — 사용자가 검색 모달에서 골라 추가.
 * 핀과 별도로 영속화되며, ID 기반이라 시드/사건 추가에 따라 자동 sync 된다.
 */
export function useEventOverlay() {
  const [ids, setIds] = useState<string[]>(() => readStorage())
  const [events, setEvents] = useState<OverlayEvent[]>([])
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    writeStorage(ids)
  }, [ids])

  useEffect(() => {
    let cancelled = false
    if (ids.length === 0) {
      setEvents([])
      return
    }
    setIsLoading(true)
    Promise.all(
      ids.map(async (id) => {
        try {
          const ev: any = await getEventById(id)
          return {
            ok: true as const,
            value: {
              id: ev.id,
              title: ev.title,
              startDate: ev.startDate ?? null,
              endDate: ev.endDate ?? null,
              categoryName: ev?.category?.name ?? ev?.eventCategory?.name ?? null,
              categoryId: ev?.category?.id ?? ev?.eventCategory?.id ?? null,
            },
          }
        } catch {
          return { ok: false as const, id }
        }
      }),
    ).then((results) => {
      if (cancelled) return
      const valid: OverlayEvent[] = []
      const failedIds: string[] = []
      for (const r of results) {
        if (r.ok && r.value.startDate) {
          valid.push(r.value as OverlayEvent)
        } else if (!r.ok) {
          failedIds.push(r.id)
        }
      }
      setEvents(valid)
      setIsLoading(false)
      // 삭제된(404 등) 이벤트 ID는 localStorage에서 제거 — 다음 진입 시 fetch 안 함
      if (failedIds.length > 0) {
        setIds((prev) => prev.filter((id) => !failedIds.includes(id)))
      }
    })
    return () => {
      cancelled = true
    }
  }, [ids])

  const add = useCallback((id: string) => {
    setIds((prev) => (prev.includes(id) ? prev : [...prev, id]))
  }, [])
  const remove = useCallback((id: string) => {
    setIds((prev) => prev.filter((x) => x !== id))
  }, [])
  const clear = useCallback(() => setIds([]), [])

  return { ids, events, isLoading, add, remove, clear }
}
