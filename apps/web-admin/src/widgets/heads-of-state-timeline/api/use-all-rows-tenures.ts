import { useMemo, useRef } from 'react'

import type { PinnedRow } from '../model/types'
import { useSegmentTenures, type SegmentTenuresResult } from './use-segment-tenures'

export interface RowTenuresResult {
  rowId: string
  segmentResults: SegmentTenuresResult[]
}

/** 두 배열의 원소 참조가 순서까지 동일한지 — 얕은 비교 */
function sameRefs<T>(a: readonly T[], b: readonly T[]): boolean {
  if (a.length !== b.length) return false
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false
  return true
}

/**
 * 모든 행의 segment tenure를 한 번에 가져와 행별로 그룹화한다.
 * react-query가 동일 queryKey를 캐싱하므로 TimelineRow가 개별 호출하던 것을 단일 호출로 합쳐
 * 다단계 컴포넌트 (요약 패널 + Row)에서 같은 데이터를 공유할 수 있다.
 *
 * `useSegmentTenures`가 결과 원소 참조를 안정적으로 유지하므로, 여기서도 행별 결과 객체를
 * 캐싱해 segment 결과 참조가 그대로면 같은 행 객체를 재사용한다 — 팬·줌 중 하위 메모 보존.
 */
export function useAllRowsTenures(rows: PinnedRow[]): RowTenuresResult[] {
  const flatSegments = useMemo(() => rows.flatMap((r) => r.segments), [rows])
  const flatResults = useSegmentTenures(flatSegments)

  const rowCacheRef = useRef(new Map<string, RowTenuresResult>())

  return useMemo(() => {
    const bySegmentId = new Map(flatResults.map((r) => [r.segmentId, r]))
    const liveRowIds = new Set<string>()

    const out = rows.map((row) => {
      liveRowIds.add(row.rowId)
      const segmentResults = row.segments
        .map((seg) => bySegmentId.get(seg.segmentId))
        .filter((r): r is SegmentTenuresResult => r != null)

      const cached = rowCacheRef.current.get(row.rowId)
      if (cached && sameRefs(cached.segmentResults, segmentResults)) {
        return cached
      }
      const next: RowTenuresResult = { rowId: row.rowId, segmentResults }
      rowCacheRef.current.set(row.rowId, next)
      return next
    })

    // 제거된 행은 캐시에서 정리
    for (const id of rowCacheRef.current.keys()) {
      if (!liveRowIds.has(id)) rowCacheRef.current.delete(id)
    }
    return out
  }, [rows, flatResults])
}
