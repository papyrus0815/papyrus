/**
 * 전개의 접기 상태 — 접은 묶음(collapsedIds)·접은 국면(foldedChapters, '소유 묶음 id|구간 열쇠')을 사건마다 기억한다.
 * collection-development.tsx에서 떼어 냈다(동작 변경 없음).
 */
import { useEffect, useRef, useState } from 'react'

/** 접기 상태 저장 열쇠 — 사건마다. 다른 사건에 다녀와도 접어 둔 그대로(예전엔 돌아오면 5,000px가 다 펼쳐졌다) */
const FOLD_STORAGE_PREFIX = 'event-development-fold:'

function readFoldState(eventId: string): {
  collapsed: Set<string>
  chapters: Set<string>
  stored: boolean
} {
  try {
    const raw = window.localStorage.getItem(`${FOLD_STORAGE_PREFIX}${eventId}`)
    if (!raw)
      return { collapsed: new Set(), chapters: new Set(), stored: false }
    const parsed = JSON.parse(raw) as {
      collapsed?: string[]
      chapters?: string[]
    }
    return {
      collapsed: new Set(parsed.collapsed ?? []),
      chapters: new Set(parsed.chapters ?? []),
      stored: true,
    }
  } catch {
    return { collapsed: new Set(), chapters: new Set(), stored: false }
  }
}

export function useDevelopmentFold(eventId: string) {
  /** 접은 묶음 — 기본은 전부 펼친다('모든 사건을 본다'). 접은 것만 기억한다 */
  const [collapsedIds, setCollapsedIds] = useState<ReadonlySet<string>>(() => readFoldState(eventId).collapsed)
  /** 접은 국면 — '사건 id|구간 열쇠'. 장 머리를 누르면 그 국면의 사건만 접힌다 */
  const [foldedChapters, setFoldedChapters] = useState<ReadonlySet<string>>(
    () => readFoldState(eventId).chapters,
  )
  /** 이 사건에 기억한 접기가 있나 — 없으면 큰 트리는 첫 방문에 기본 접기를 쓴다(아래 autoFold) */
  const foldStoredRef = useRef(readFoldState(eventId).stored)
  /* 다른 사건으로 옮겨 가면 그 사건의 접기 상태로 */
  const foldLoadedFor = useRef(eventId)
  useEffect(() => {
    if (foldLoadedFor.current === eventId) return
    foldLoadedFor.current = eventId
    const stored = readFoldState(eventId)
    foldStoredRef.current = stored.stored
    setCollapsedIds(stored.collapsed)
    setFoldedChapters(stored.chapters)
  }, [eventId])
  useEffect(() => {
    if (foldLoadedFor.current !== eventId) return
    /* 아무것도 접지 않은 첫 상태는 적지 않는다 — 적으면 '기억 있음'이 되어 다음 방문의 기본 접기가 꺼진다 */
    if (
      !foldStoredRef.current &&
      collapsedIds.size === 0 &&
      foldedChapters.size === 0
    )
      return
    foldStoredRef.current = true
    try {
      window.localStorage.setItem(
        `${FOLD_STORAGE_PREFIX}${eventId}`,
        JSON.stringify({ collapsed: [...collapsedIds], chapters: [...foldedChapters] }),
      )
    } catch {
      /* 저장 못 해도 이번 방문 동안은 접힌 그대로 */
    }
  }, [eventId, collapsedIds, foldedChapters])
  return { collapsedIds, setCollapsedIds, foldedChapters, setFoldedChapters, foldStoredRef }
}
