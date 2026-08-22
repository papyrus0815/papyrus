/**
 * 사이드바 '고정'·'최근' 빠른 접근 — 도메인별 storageKey로 분리한 localStorage 목록.
 *
 * 국가는 예전부터 별도 zustand store(pinned-countries / recent-countries)를 쓰고, 인물도
 * 인포그래픽 store에 핀이 있다. 새로 붙는 도메인들이 store를 하나씩 더 만들 이유는 없어
 * 공용 훅으로 둔다 — 저장 형식은 문자열 id 배열로 동일하다.
 */
import { useCallback, useEffect, useState } from 'react'

import { useSearchParams } from 'react-router-dom'

const MAX_RECENT = 8

function read(storageKey: string): string[] {
  try {
    const saved = localStorage.getItem(storageKey)
    if (!saved) return []
    const parsed = JSON.parse(saved)
    return Array.isArray(parsed) ? (parsed as string[]) : []
  } catch {
    return []
  }
}

function write(storageKey: string, ids: string[]) {
  try {
    localStorage.setItem(storageKey, JSON.stringify(ids))
  } catch {
    /* 저장 실패는 무시 */
  }
}

export function useSidebarPins(storageKey: string) {
  const [pinnedIds, setPinnedIds] = useState<string[]>(() => read(storageKey))

  const togglePin = useCallback(
    (id: string) => {
      setPinnedIds((previous) => {
        const next = previous.includes(id)
          ? previous.filter((pinnedId) => pinnedId !== id)
          : [...previous, id]
        write(storageKey, next)
        return next
      })
    },
    [storageKey],
  )

  return { pinnedIds, togglePin }
}

/**
 * 최근 방문 — currentId가 바뀔 때마다 맨 앞으로 올린다.
 * currentId가 null이면(목록만 보는 중) 아무것도 하지 않는다.
 */
export function useSidebarRecents(storageKey: string, currentId: string | null) {
  const [recentIds, setRecentIds] = useState<string[]>(() => read(storageKey))

  useEffect(() => {
    if (!currentId) return
    setRecentIds((previous) => {
      if (previous[0] === currentId) return previous
      const next = [
        currentId,
        ...previous.filter((id) => id !== currentId),
      ].slice(0, MAX_RECENT)
      write(storageKey, next)
      return next
    })
  }, [currentId, storageKey])

  return recentIds
}

/**
 * 상세 라우트가 없는 지면의 선택 — URL 쿼리에 기록하고 우측 본문의 해당 카드로 스크롤한다.
 *
 * 카드에는 `data-entity-id="<id>"`를 달아 두면 된다. 앵커가 없으면 선택만 URL에 남는다
 * (뒤로가기·공유로 복원되므로 아무 일도 안 하는 것보다 낫다).
 */
export function useAnchorSelection(paramName = 'selected') {
  const [searchParams, setSearchParams] = useSearchParams()
  const selectedId = searchParams.get(paramName)

  const select = useCallback(
    (id: string) => {
      const next = new URLSearchParams(searchParams)
      next.set(paramName, id)
      // 목록에서 항목을 훑는 동작은 history를 채울 일이 아니다 — replace로 남긴다.
      setSearchParams(next, { replace: true })
      requestAnimationFrame(() => {
        document
          .querySelector(`[data-entity-id="${CSS.escape(id)}"]`)
          ?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      })
    },
    [searchParams, setSearchParams, paramName],
  )

  return { selectedId, select }
}
