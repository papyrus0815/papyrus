import { useEffect, useState } from 'react'

/** 입력 후 ms 동안 변경 없으면 반영. 검색어 throttle용. */
export function useDebouncedValue<T>(value: T, ms: number = 200): T {
  const [v, setV] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms)
    return () => clearTimeout(t)
  }, [value, ms])
  return v
}
