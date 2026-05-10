import { useCallback, useEffect, useState } from 'react'

import type { YearRange } from './types'

export interface UserTimePreset {
  id: string
  label: string
  range: YearRange
}

const KEY = 'heads-of-state-timeline:user-presets:v1'

function read(): UserTimePreset[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter(
      (p: any) =>
        p &&
        typeof p.id === 'string' &&
        typeof p.label === 'string' &&
        p.range &&
        typeof p.range.startYear === 'number' &&
        typeof p.range.endYear === 'number',
    )
  } catch {
    return []
  }
}
function write(list: UserTimePreset[]) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(KEY, JSON.stringify(list))
  } catch {
    // ignore
  }
}

/**
 * 사용자가 자주 쓰는 시대를 별명과 함께 저장 — RangeControls 옆에 노출되어 클릭으로 이동.
 */
export function useUserPresets() {
  const [list, setList] = useState<UserTimePreset[]>(() => read())

  useEffect(() => {
    write(list)
  }, [list])

  const add = useCallback((label: string, range: YearRange) => {
    const id = `p${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`
    setList((prev) => [...prev, { id, label, range }])
  }, [])

  const remove = useCallback((id: string) => {
    setList((prev) => prev.filter((p) => p.id !== id))
  }, [])

  return { list, add, remove }
}
