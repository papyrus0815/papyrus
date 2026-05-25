/**
 * 좌측 패널 접기/펼치기 상태 — localStorage로 세션 간 유지.
 *
 * 뷰마다 storageKey를 다르게 주면 각자 독립 상태를 갖는다.
 * defaultCollapsed로 처음 진입 시 기본값을 정한다(저장값이 없을 때만 적용).
 */
import { useCallback, useState } from 'react'

const DEFAULT_STORAGE_KEY = 'country-list-collapsed'

export interface UseListCollapsedOptions {
  storageKey?: string
  defaultCollapsed?: boolean
}

export function useListCollapsed(options: UseListCollapsedOptions = {}): {
  collapsed: boolean
  toggle: () => void
  set: (v: boolean) => void
} {
  const { storageKey = DEFAULT_STORAGE_KEY, defaultCollapsed = false } = options

  const [collapsed, setCollapsed] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem(storageKey)
      if (saved === null) return defaultCollapsed
      return JSON.parse(saved) === true
    } catch {
      return defaultCollapsed
    }
  })

  const persist = useCallback(
    (next: boolean) => {
      try {
        localStorage.setItem(storageKey, JSON.stringify(next))
      } catch {
        // localStorage 쓰기 실패 시 무시 (Safari 프라이빗 모드 등)
      }
    },
    [storageKey],
  )

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
