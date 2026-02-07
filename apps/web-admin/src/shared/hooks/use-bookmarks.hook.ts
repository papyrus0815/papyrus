/**
 * 사건 즐겨찾기 Hook
 */
import { useState, useEffect } from 'react'

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
    } catch (error) {
      console.error('즐겨찾기 로드 실패:', error)
    }
  }, [])

  // localStorage에 저장
  const saveToStorage = (newBookmarks: Set<string>) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(newBookmarks)))
    } catch (error) {
      console.error('즐겨찾기 저장 실패:', error)
    }
  }

  const toggleBookmark = (eventId: string) => {
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
  }

  const isBookmarked = (eventId: string) => bookmarks.has(eventId)

  return {
    bookmarks,
    toggleBookmark,
    isBookmarked,
  }
}
