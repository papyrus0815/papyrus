/**
 * 사건 즐겨찾기 Hook
 */
import { useCallback, useEffect, useState } from 'react'

const STORAGE_KEY = 'papyrus_event_bookmarks'

export const useBookmarks = () => {
  const [bookmarks, setBookmarks] = useState<Set<string>>(new Set())

  // localStorage에서 불러오기
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        setBookmarks(new Set(JSON.parse(stored)))
      }
    } catch {
      // ignore
    }
  }, [])

  // localStorage에 저장
  const saveToStorage = (newBookmarks: Set<string>) => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(Array.from(newBookmarks)),
      )
    } catch {
      // ignore
    }
  }

  const toggleBookmark = useCallback((eventId: string) => {
    setBookmarks((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(eventId)) {
        newSet.delete(eventId)
      } else {
        newSet.add(eventId)
      }
      saveToStorage(newSet)
      return newSet
    })
  }, [])

  /**
   * 저장된 북마크에서 특정 id를 제거한다 — 사건 삭제 경로에서 쓴다.
   *
   * 북마크는 정리 로직이 없어서, 북마크한 사건을 지워도 id가 그대로 남았다.
   * 그러면 툴바 배지는 12인데 '북마크만'은 11행을 보여주고, 전부 삭제된 경우엔
   * 배지 12 + '조건과 일치하는 사건이 없습니다'가 동시에 떠 필터 버그로 오인된다(검토 CR-6).
   */
  const removeBookmark = useCallback((eventId: string) => {
    setBookmarks((prev) => {
      if (!prev.has(eventId)) return prev
      const next = new Set(prev)
      next.delete(eventId)
      saveToStorage(next)
      return next
    })
  }, [])

  const isBookmarked = useCallback(
    (eventId: string) => bookmarks.has(eventId),
    [bookmarks],
  )

  return {
    bookmarks,
    toggleBookmark,
    removeBookmark,
    isBookmarked,
  }
}
