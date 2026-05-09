import AsyncStorage from '@react-native-async-storage/async-storage'
import { useCallback, useEffect, useState } from 'react'

const PREFIX = 'papyrus:search-history:'
const MAX_ITEMS = 8

/** 검색 history 영역 키. 화면별로 분리. */
export type HistoryScope = 'persons' | 'events' | 'countries'

async function loadHistory(scope: HistoryScope): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(PREFIX + scope)
    if (!raw) return []
    const arr = JSON.parse(raw)
    return Array.isArray(arr) ? arr.filter((s) => typeof s === 'string') : []
  } catch {
    return []
  }
}

async function saveHistory(scope: HistoryScope, items: string[]) {
  try {
    await AsyncStorage.setItem(PREFIX + scope, JSON.stringify(items.slice(0, MAX_ITEMS)))
  } catch {
    // ignore
  }
}

/**
 * 영역별 최근 검색어 hook.
 * - mount 시 비동기 로드
 * - push(query): 가장 앞에 추가, 중복 제거, MAX_ITEMS 유지
 * - remove(query): 특정 항목 제거
 * - clear(): 전체 비움
 */
export function useSearchHistory(scope: HistoryScope) {
  const [items, setItems] = useState<string[]>([])
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    let cancel = false
    loadHistory(scope).then((arr) => {
      if (!cancel) {
        setItems(arr)
        setLoaded(true)
      }
    })
    return () => {
      cancel = true
    }
  }, [scope])

  const push = useCallback(
    (q: string) => {
      const trimmed = q.trim()
      if (!trimmed) return
      setItems((prev) => {
        const next = [trimmed, ...prev.filter((it) => it !== trimmed)].slice(0, MAX_ITEMS)
        void saveHistory(scope, next)
        return next
      })
    },
    [scope],
  )

  const remove = useCallback(
    (q: string) => {
      setItems((prev) => {
        const next = prev.filter((it) => it !== q)
        void saveHistory(scope, next)
        return next
      })
    },
    [scope],
  )

  const clear = useCallback(() => {
    setItems([])
    void saveHistory(scope, [])
  }, [scope])

  return { items, loaded, push, remove, clear }
}
