import { useCallback, useEffect, useState } from 'react'

import type { PositionTypeCategory } from '../lib/normalize-tenures'
import { readJSON, writeJSON } from '../lib/storage'

const KEY = 'category-filter:v1'
const ALL: PositionTypeCategory[] = ['MONARCH', 'PRESIDENT', 'PM', 'POPE', 'OTHER']

/**
 * 막대 카테고리 노출 토글 — 군주만, 대통령만 같은 단일 카테고리 비교가 필요할 때 사용.
 * 영속화는 단순 string[] (선택된 카테고리 목록).
 */
export function useCategoryFilter() {
  const [enabled, setEnabled] = useState<Set<PositionTypeCategory>>(() => {
    const raw = readJSON<string[]>(KEY, ALL)
    const valid = (Array.isArray(raw) ? raw : ALL).filter((s) =>
      ALL.includes(s as PositionTypeCategory),
    ) as PositionTypeCategory[]
    return new Set(valid.length === 0 ? ALL : valid)
  })

  useEffect(() => {
    writeJSON(KEY, Array.from(enabled))
  }, [enabled])

  const toggle = useCallback((c: PositionTypeCategory) => {
    setEnabled((prev) => {
      const next = new Set(prev)
      if (next.has(c)) next.delete(c)
      else next.add(c)
      // 0개 선택 방지 — 모두 끄면 전체 켜기로 reset
      if (next.size === 0) ALL.forEach((x) => next.add(x))
      return next
    })
  }, [])

  const enable = useCallback((c: PositionTypeCategory) => {
    setEnabled((prev) => {
      if (prev.has(c)) return prev
      const next = new Set(prev)
      next.add(c)
      return next
    })
  }, [])

  const reset = useCallback(() => {
    setEnabled(new Set(ALL))
  }, [])

  const isEnabled = useCallback(
    (c: PositionTypeCategory) => enabled.has(c),
    [enabled],
  )

  const isAllEnabled = enabled.size === ALL.length

  return { enabled, isEnabled, isAllEnabled, toggle, enable, reset }
}
