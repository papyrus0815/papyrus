import { useEffect, useState } from 'react'

/**
 * 입력 검색 등에 사용 — 값이 안정된 뒤에만 하위 로직(필터·API) 실행
 */
export function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value)

  useEffect(() => {
    const id = window.setTimeout(() => setDebounced(value), delayMs)
    return () => window.clearTimeout(id)
  }, [value, delayMs])

  return debounced
}
