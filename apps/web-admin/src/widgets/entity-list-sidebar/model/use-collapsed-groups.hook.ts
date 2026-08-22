/**
 * 사이드바 그룹 아코디언 접힘 상태 — 도메인별 storageKey로 분리.
 *
 * 'all' sentinel: 첫 진입(localStorage 없음)에는 데이터가 오기 전부터 전 그룹을 접힌 것으로
 * 취급한다. 그래야 목록이 도착하는 순간 전부 펼쳐졌다 접히는 깜빡임이 없다.
 * 사용자가 한 번이라도 토글하면 실제 Set으로 materialize 된다.
 */
import { useCallback, useState } from 'react'

export interface CollapsedGroupsApi {
  isCollapsed: (groupId: string) => boolean
  toggle: (groupId: string) => void
  /** 선택 항목이 접힌 그룹에 있을 때 임시로 펼침 — localStorage에 기록하지 않는다 */
  expandForSelection: (groupId: string) => void
}

export function useCollapsedGroups(
  storageKey: string,
  /** 'all'을 실제 Set으로 펼칠 때 접힌 것으로 넣을 그룹 id들 */
  collapsibleGroupIds: string[],
  /** 'all'이어도 펼쳐둘 그룹 id들 (고정·최근 등) */
  alwaysExpandedIds: string[] = [],
): CollapsedGroupsApi {
  const [collapsed, setCollapsed] = useState<Set<string> | 'all'>(() => {
    try {
      const saved = localStorage.getItem(storageKey)
      return saved ? new Set(JSON.parse(saved) as string[]) : 'all'
    } catch {
      return 'all'
    }
  })

  const isCollapsed = useCallback(
    (groupId: string): boolean => {
      if (alwaysExpandedIds.includes(groupId)) {
        return collapsed !== 'all' && collapsed.has(groupId)
      }
      if (collapsed === 'all') return true
      return collapsed.has(groupId)
    },
    [collapsed, alwaysExpandedIds],
  )

  const materialize = useCallback(
    (previous: Set<string> | 'all'): Set<string> =>
      previous === 'all' ? new Set(collapsibleGroupIds) : new Set(previous),
    [collapsibleGroupIds],
  )

  const toggle = useCallback(
    (groupId: string) => {
      setCollapsed((previous) => {
        const base = materialize(previous)
        if (base.has(groupId)) base.delete(groupId)
        else base.add(groupId)
        try {
          localStorage.setItem(storageKey, JSON.stringify(Array.from(base)))
        } catch {
          /* Safari 프라이빗 모드 등 — 저장 실패는 무시 */
        }
        return base
      })
    },
    [materialize, storageKey],
  )

  const expandForSelection = useCallback(
    (groupId: string) => {
      setCollapsed((previous) => {
        if (previous !== 'all' && !previous.has(groupId)) return previous
        const base = materialize(previous)
        base.delete(groupId)
        return base
      })
    },
    [materialize],
  )

  return { isCollapsed, toggle, expandForSelection }
}
