/**
 * 최근 본 사건 추적 Hook
 */
import { useCallback, useEffect, useState } from 'react'

export const RECENT_EVENTS_STORAGE_KEY = 'papyrus_recent_events'
const LEGACY_SIDEBAR_RECENTS_KEY = 'event-sidebar-recents'
const MAX_RECENT = 10

export const useRecentEvents = () => {
  const [recentEvents, setRecentEvents] = useState<string[]>([])

  // localStorage에서 불러오기 (기존 사이드바 별도 키가 있으면 병합 마이그레이션)
  useEffect(() => {
    try {
      const stored = localStorage.getItem(RECENT_EVENTS_STORAGE_KEY)
      const legacy = localStorage.getItem(LEGACY_SIDEBAR_RECENTS_KEY)
      const primaryIds: string[] = stored ? JSON.parse(stored) : []
      const legacyIds: string[] = legacy ? JSON.parse(legacy) : []
      const merged = Array.from(
        new Set([
          ...(Array.isArray(primaryIds) ? primaryIds : []),
          ...(Array.isArray(legacyIds) ? legacyIds : []),
        ]),
      ).slice(0, MAX_RECENT)
      if (merged.length > 0) {
        setRecentEvents(merged)
      }
      if (legacy) {
        localStorage.setItem(RECENT_EVENTS_STORAGE_KEY, JSON.stringify(merged))
        localStorage.removeItem(LEGACY_SIDEBAR_RECENTS_KEY)
      }
    } catch {
      // ignore
    }
  }, [])

  // 사건 조회 기록
  const addRecentEvent = useCallback((eventId: string) => {
    setRecentEvents((prev) => {
      // 중복 제거 후 앞에 추가
      const filtered = prev.filter((id) => id !== eventId)
      const newList = [eventId, ...filtered].slice(0, MAX_RECENT)

      try {
        localStorage.setItem(RECENT_EVENTS_STORAGE_KEY, JSON.stringify(newList))
      } catch {
        // ignore
      }

      return newList
    })
  }, [])

  // 삭제된 사건을 최근 본 기록에서 제거
  const removeRecentEvent = useCallback((eventId: string) => {
    setRecentEvents((prev) => {
      if (!prev.includes(eventId)) return prev
      const newList = prev.filter((id) => id !== eventId)

      try {
        localStorage.setItem(RECENT_EVENTS_STORAGE_KEY, JSON.stringify(newList))
      } catch {
        // ignore
      }

      return newList
    })
  }, [])

  return {
    recentEvents,
    addRecentEvent,
    removeRecentEvent,
  }
}
