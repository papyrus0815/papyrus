/**
 * 좌측 패널 접기/펼치기 상태 — localStorage로 세션 간 유지.
 */
import { useCallback, useState } from 'react'

const STORAGE_KEY = 'country-list-collapsed'

export function useListCollapsed(): {
  collapsed: boolean
  toggle: () => void
  set: (v: boolean) => void
} {
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      return saved ? JSON.parse(saved) === true : false
    } catch {
      return false
    }
  })

  const persist = useCallback((next: boolean) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
    } catch {
      // localStorage 쓰기 실패 시 무시 (Safari 프라이빗 모드 등)
    }
  }, [])

  const toggle = useCallback(() => {
    setCollapsed((prev) => {
      const next = !prev
      persist(next)
      return next
    })
  }, [persist])

  const set = useCallback(
    (v: boolean) => {
      setCollapsed(v)
      persist(v)
    },
    [persist],
  )

  return { collapsed, toggle, set }
}
