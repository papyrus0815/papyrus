import AsyncStorage from '@react-native-async-storage/async-storage'
import { useCallback, useEffect, useState } from 'react'

const PREFIX = 'papyrus:bookmarks:'

export type BookmarkScope = 'persons' | 'events' | 'countries'

async function loadIds(scope: BookmarkScope): Promise<Set<string>> {
  try {
    const raw = await AsyncStorage.getItem(PREFIX + scope)
    if (!raw) return new Set()
    const arr = JSON.parse(raw)
    return new Set(Array.isArray(arr) ? arr.filter((s) => typeof s === 'string') : [])
  } catch {
    return new Set()
  }
}

async function saveIds(scope: BookmarkScope, ids: Set<string>) {
  try {
    await AsyncStorage.setItem(PREFIX + scope, JSON.stringify([...ids]))
  } catch {
    // ignore
  }
}

/**
 * 영역별 즐겨찾기 hook.
 * - mount 시 저장된 ID 세트 로드
 * - toggle(id): 추가/제거 토글, AsyncStorage 즉시 반영
 * - has(id): 즐겨찾기 여부 동기 확인
 */
export function useBookmarks(scope: BookmarkScope) {
  const [ids, setIds] = useState<Set<string>>(() => new Set())
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    let cancel = false
    loadIds(scope).then((set) => {
      if (!cancel) {
        setIds(set)
        setLoaded(true)
      }
    })
    return () => {
      cancel = true
    }
  }, [scope])

  const toggle = useCallback(
    (id: string) => {
      setIds((prev) => {
        const next = new Set(prev)
        if (next.has(id)) next.delete(id)
        else next.add(id)
        void saveIds(scope, next)
        return next
      })
    },
    [scope],
  )

  const has = useCallback((id: string) => ids.has(id), [ids])

  return { ids, has, toggle, loaded, count: ids.size }
}
