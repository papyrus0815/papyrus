import { useCallback, useEffect, useState } from 'react'

import type { PinnedRow, PinnedSegment } from './types'

const STORAGE_KEY_V1 = 'heads-of-state-timeline:pinned-rows:v1'
const STORAGE_KEY = 'heads-of-state-timeline:pinned-rows:v2'

function isValidSegment(s: any): s is PinnedSegment {
  return (
    s &&
    typeof s.segmentId === 'string' &&
    (s.kind === 'COUNTRY' || s.kind === 'HISTORICAL') &&
    typeof s.countryId === 'string' &&
    typeof s.name === 'string'
  )
}

/** v1 레거시도 흡수해 v2로 자연스럽게 마이그레이션 */
function readStorage(): PinnedRow[] {
  if (typeof window === 'undefined') return []
  try {
    const raw =
      window.localStorage.getItem(STORAGE_KEY) ??
      window.localStorage.getItem(STORAGE_KEY_V1)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed
      .filter(
        (r: any) => r && typeof r.rowId === 'string' && Array.isArray(r.segments),
      )
      .map((r: any) => ({
        rowId: r.rowId,
        segments: r.segments
          .filter(isValidSegment)
          .map((s: PinnedSegment) => ({
            segmentId: s.segmentId,
            kind: s.kind,
            countryId: s.countryId,
            name: s.name,
            flagEmoji: s.flagEmoji ?? null,
            lifespanStartYear:
              typeof s.lifespanStartYear === 'number' ? s.lifespanStartYear : null,
            lifespanEndYear:
              typeof s.lifespanEndYear === 'number' ? s.lifespanEndYear : null,
          })),
      }))
      .filter((r: PinnedRow) => r.segments.length > 0)
  } catch {
    return []
  }
}

function writeStorage(rows: PinnedRow[]) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(rows))
  } catch {
    // 용량 초과·시크릿 모드 등은 무시
  }
}

function makeId() {
  return `r${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`
}

/**
 * 핀 목록을 localStorage에 영속화하는 훅.
 * 행(Row) 단위로 추가/제거/순서변경, 그리고 한 행 안의 segment 추가/제거를 지원한다.
 */
export function usePinnedRows() {
  const [rows, setRows] = useState<PinnedRow[]>(() => readStorage())

  useEffect(() => {
    writeStorage(rows)
  }, [rows])

  const addRow = useCallback(
    (segment: Omit<PinnedSegment, 'segmentId'>) => {
      setRows((prev) => {
        const exists = prev.some((r) =>
          r.segments.some(
            (s) =>
              s.kind === segment.kind && s.countryId === segment.countryId,
          ),
        )
        if (exists) return prev
        return [
          ...prev,
          {
            rowId: makeId(),
            segments: [{ ...segment, segmentId: makeId() }],
          },
        ]
      })
    },
    [],
  )

  const removeRow = useCallback((rowId: string) => {
    setRows((prev) => prev.filter((r) => r.rowId !== rowId))
  }, [])

  /** 한 행 안에 segment 추가 — 계승국 묶기 */
  const addSegmentToRow = useCallback(
    (rowId: string, segment: Omit<PinnedSegment, 'segmentId'>) => {
      setRows((prev) =>
        prev.map((r) => {
          if (r.rowId !== rowId) return r
          const exists = r.segments.some(
            (s) =>
              s.kind === segment.kind && s.countryId === segment.countryId,
          )
          if (exists) return r
          return {
            ...r,
            segments: [...r.segments, { ...segment, segmentId: makeId() }],
          }
        }),
      )
    },
    [],
  )

  const removeSegmentFromRow = useCallback(
    (rowId: string, segmentId: string) => {
      setRows((prev) =>
        prev
          .map((r) =>
            r.rowId === rowId
              ? { ...r, segments: r.segments.filter((s) => s.segmentId !== segmentId) }
              : r,
          )
          .filter((r) => r.segments.length > 0),
      )
    },
    [],
  )

  const moveRow = useCallback((rowId: string, direction: 'up' | 'down') => {
    setRows((prev) => {
      const idx = prev.findIndex((r) => r.rowId === rowId)
      if (idx < 0) return prev
      const target = direction === 'up' ? idx - 1 : idx + 1
      if (target < 0 || target >= prev.length) return prev
      const next = prev.slice()
      const [moved] = next.splice(idx, 1)
      if (!moved) return prev
      next.splice(target, 0, moved)
      return next
    })
  }, [])

  /** 드래그 reorder — fromIndex 행을 toIndex 위치로 이동 */
  const reorderRow = useCallback((fromIndex: number, toIndex: number) => {
    setRows((prev) => {
      if (fromIndex === toIndex) return prev
      if (fromIndex < 0 || fromIndex >= prev.length) return prev
      if (toIndex < 0 || toIndex >= prev.length) return prev
      const next = prev.slice()
      const [moved] = next.splice(fromIndex, 1)
      if (!moved) return prev
      next.splice(toIndex, 0, moved)
      return next
    })
  }, [])

  /** 외부에서 (URL 등) 일괄 교체 — 영속화는 useEffect가 자동으로 처리 */
  const replaceAll = useCallback((nextRows: PinnedRow[]) => {
    setRows(nextRows)
  }, [])

  /** 옵션 fetch 후 unknown countryId 핀을 정리할 수 있게 하는 일괄 변경 */
  const reconcile = useCallback(
    (
      isKnown: (kind: PinnedSegment['kind'], countryId: string) => boolean,
      patch?: (s: PinnedSegment) => Partial<PinnedSegment>,
    ) => {
      setRows((prev) => {
        let changed = false
        const next: PinnedRow[] = []
        for (const row of prev) {
          const segments: PinnedSegment[] = []
          for (const s of row.segments) {
            if (!isKnown(s.kind, s.countryId)) {
              changed = true
              continue
            }
            if (patch) {
              const p = patch(s)
              const merged = { ...s, ...p }
              if (
                p.flagEmoji !== undefined && p.flagEmoji !== s.flagEmoji ||
                (p.lifespanStartYear !== undefined &&
                  p.lifespanStartYear !== s.lifespanStartYear) ||
                (p.lifespanEndYear !== undefined &&
                  p.lifespanEndYear !== s.lifespanEndYear) ||
                (p.name !== undefined && p.name !== s.name)
              ) {
                changed = true
              }
              segments.push(merged)
            } else {
              segments.push(s)
            }
          }
          if (segments.length > 0) {
            next.push({ ...row, segments })
          } else {
            changed = true
          }
        }
        return changed ? next : prev
      })
    },
    [],
  )

  const clearAll = useCallback(() => {
    setRows([])
  }, [])

  return {
    rows,
    addRow,
    removeRow,
    addSegmentToRow,
    removeSegmentFromRow,
    moveRow,
    reorderRow,
    replaceAll,
    reconcile,
    clearAll,
  }
}
