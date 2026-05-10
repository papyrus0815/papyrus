import { useMemo } from 'react'

import type { PinnedRow } from '../model/types'
import { useSegmentTenures, type SegmentTenuresResult } from './use-segment-tenures'

export interface RowTenuresResult {
  rowId: string
  segmentResults: SegmentTenuresResult[]
}

/**
 * 모든 행의 segment tenure를 한 번에 가져와 행별로 그룹화한다.
 * react-query가 동일 queryKey를 캐싱하므로 TimelineRow가 개별 호출하던 것을 단일 호출로 합쳐
 * 다단계 컴포넌트 (요약 패널 + Row)에서 같은 데이터를 공유할 수 있다.
 */
export function useAllRowsTenures(rows: PinnedRow[]): RowTenuresResult[] {
  const flatSegments = useMemo(() => rows.flatMap((r) => r.segments), [rows])
  const flatResults = useSegmentTenures(flatSegments)

  return useMemo(() => {
    const bySegmentId = new Map(flatResults.map((r) => [r.segmentId, r]))
    return rows.map((row) => ({
      rowId: row.rowId,
      segmentResults: row.segments
        .map((seg) => bySegmentId.get(seg.segmentId))
        .filter((r): r is SegmentTenuresResult => r != null),
    }))
  }, [rows, flatResults])
}
