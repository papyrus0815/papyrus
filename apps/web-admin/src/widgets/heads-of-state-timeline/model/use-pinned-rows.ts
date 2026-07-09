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
    // 딥링크로 세션에만 얹힌 행(transient)은 저장하지 않는다 —
    // 호기심 클릭 한 번이 저장 핀 보드를 영구 변경하지 않도록.
    const durable = rows
      .filter((row) => !row.transient)
      .map((row) => ({ rowId: row.rowId, segments: row.segments }))
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(durable))
  } catch {
    // 용량 초과·시크릿 모드 등은 무시
  }
}

function makeId() {
  return `r${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`
}

/**
 * 사용자가 보드를 직접 조작하는 순간 transient 행을 채택(durable 전환)한다 —
 * 딥링크로 온 행이라도 그 위에서 작업을 시작했다면 사용자의 보드로 간주.
 * 변경이 없으면 같은 참조를 돌려줘 불필요한 재렌더·재저장을 피한다.
 */
function adoptTransientRows(rows: PinnedRow[]): PinnedRow[] {
  if (!rows.some((row) => row.transient)) return rows
  return rows.map((row) =>
    row.transient ? { rowId: row.rowId, segments: row.segments } : row,
  )
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
        const base = adoptTransientRows(prev)
        const exists = base.some((r) =>
          r.segments.some(
            (s) =>
              s.kind === segment.kind && s.countryId === segment.countryId,
          ),
        )
        if (exists) return base
        return [
          ...base,
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
    setRows((prev) =>
      adoptTransientRows(prev).filter((row) => row.rowId !== rowId),
    )
  }, [])

  /** 한 행 안에 segment 추가 — 계승국 묶기 */
  const addSegmentToRow = useCallback(
    (rowId: string, segment: Omit<PinnedSegment, 'segmentId'>) => {
      setRows((prev) =>
        adoptTransientRows(prev).map((row) => {
          if (row.rowId !== rowId) return row
          const exists = row.segments.some(
            (seg) =>
              seg.kind === segment.kind && seg.countryId === segment.countryId,
          )
          if (exists) return row
          return {
            ...row,
            segments: [...row.segments, { ...segment, segmentId: makeId() }],
          }
        }),
      )
    },
    [],
  )

  const removeSegmentFromRow = useCallback(
    (rowId: string, segmentId: string) => {
      setRows((prev) =>
        adoptTransientRows(prev)
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
      const base = adoptTransientRows(prev)
      const idx = base.findIndex((row) => row.rowId === rowId)
      if (idx < 0) return prev
      const target = direction === 'up' ? idx - 1 : idx + 1
      if (target < 0 || target >= base.length) return prev
      const next = base.slice()
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
      const base = adoptTransientRows(prev)
      const next = base.slice()
      const [moved] = next.splice(fromIndex, 1)
      if (!moved) return prev
      next.splice(toIndex, 0, moved)
      return next
    })
  }, [])

  /** Undo 복원 — 원래 인덱스에 row 전체(계승국 묶음 포함)를 그대로 다시 삽입.
   *  중복(같은 kind+countryId 가 다른 행에 이미 존재)인 segment는 자동 제외.
   *  rowId 충돌 가능성을 피해 새 ID 발급 + segment ID도 새로 발급. */
  const restoreRowAt = useCallback((index: number, row: PinnedRow) => {
    setRows((prev) => {
      const base = adoptTransientRows(prev)
      const exists = new Set(
        base.flatMap((row) =>
          row.segments.map((seg) => `${seg.kind}:${seg.countryId}`),
        ),
      )
      const segments = row.segments
        .filter((s) => !exists.has(`${s.kind}:${s.countryId}`))
        .map((s) => ({ ...s, segmentId: makeId() }))
      if (segments.length === 0) return prev
      const next = base.slice()
      const restored: PinnedRow = { rowId: makeId(), segments }
      const safeIdx = Math.max(0, Math.min(index, next.length))
      next.splice(safeIdx, 0, restored)
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
    restoreRowAt,
    replaceAll,
    reconcile,
    clearAll,
  }
}
