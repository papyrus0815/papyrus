import { useEffect, useState } from 'react'

/** 검색·필터 입력 디바운스 기본 지연 (ms). 화면별 일관성을 위해 단일 상수 사용. */
export const SEARCH_DEBOUNCE_MS = 200

/** 입력 후 ms 동안 변경 없으면 반영. 검색어 throttle용. */
export function useDebouncedValue<T>(value: T, ms: number = SEARCH_DEBOUNCE_MS): T {
  const [v, setV] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms)
    return () => clearTimeout(t)
  }, [value, ms])
  return v
}
