import { useEffect, useRef, useState } from 'react'

/**
 * 입력 검색 등에 사용 — 값이 안정된 뒤에만 하위 로직(필터·API) 실행
 *
 * @param resetTrigger 예: 선택 영토(territoryKey)가 바뀌면 즉시 debounced를 현재 value로 맞춤
 *   (이전 영토에서 입력한 검색어가 280ms 동안 새 국가 필터와 섞이는 것을 방지)
 */
export function useDebouncedValue<T>(
  value: T,
  delayMs: number,
  resetTrigger?: unknown,
): T {
  const [debounced, setDebounced] = useState(value)
  const prevReset = useRef<unknown>(undefined)

  useEffect(() => {
    if (resetTrigger === undefined) return
    if (prevReset.current === resetTrigger) return
    prevReset.current = resetTrigger
    setDebounced(value)
  }, [resetTrigger, value])

  useEffect(() => {
    const id = window.setTimeout(() => setDebounced(value), delayMs)
    return () => window.clearTimeout(id)
  }, [value, delayMs])

  return debounced
}
