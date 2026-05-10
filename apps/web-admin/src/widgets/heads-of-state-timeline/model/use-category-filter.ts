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

  /** 토글 — 0개 선택 허용. 사용자가 모든 카테고리를 끄면 timeline은 빈 상태로 유지(의도). */
  const toggle = useCallback((c: PositionTypeCategory) => {
    setEnabled((prev) => {
      const next = new Set(prev)
      if (next.has(c)) next.delete(c)
      else next.add(c)
      return next
    })
  }, [])

  const reset = useCallback(() => {
    setEnabled(new Set(ALL))
  }, [])

  /** 외부(URL params)에서 일괄 set — URL ↔ state 동기화용 */
  const setFromList = useCallback((cats: PositionTypeCategory[]) => {
    setEnabled(new Set(cats))
  }, [])

  const isEnabled = useCallback(
    (c: PositionTypeCategory) => enabled.has(c),
    [enabled],
  )

  const isAllEnabled = enabled.size === ALL.length

  return {
    enabled,
    isEnabled,
    isAllEnabled,
    toggle,
    reset,
    setFromList,
    /** URL 동기화용 직렬화 */
    asList: Array.from(enabled),
  }
}
