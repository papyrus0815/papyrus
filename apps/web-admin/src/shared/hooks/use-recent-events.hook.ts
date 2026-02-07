/**
 * 최근 본 사건 추적 Hook
 */
import { useState, useEffect } from 'react'

const STORAGE_KEY = 'papyrus_recent_events'
const MAX_RECENT = 10

export const useRecentEvents = () => {
  const [recentEvents, setRecentEvents] = useState<string[]>([])

  // localStorage에서 불러오기
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        setRecentEvents(JSON.parse(stored))
      }
    } catch (error) {
      console.error('최근 본 사건 로드 실패:', error)
    }
  }, [])

  // 사건 조회 기록
  const addRecentEvent = (eventId: string) => {
    setRecentEvents((prev) => {
      // 중복 제거 후 앞에 추가
      const filtered = prev.filter((id) => id !== eventId)
      const newList = [eventId, ...filtered].slice(0, MAX_RECENT)
      
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(newList))
      } catch (error) {
        console.error('최근 본 사건 저장 실패:', error)
      }
      
      return newList
    })
  }

  return {
    recentEvents,
    addRecentEvent,
  }
}
