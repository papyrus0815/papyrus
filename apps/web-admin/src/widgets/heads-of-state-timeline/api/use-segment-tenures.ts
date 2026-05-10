import { useQueries } from '@tanstack/react-query'

import { personCareerApi } from '@/shared/api/person-career'

import type { PinnedSegment } from '../model/types'
import { normalizeTenures, type TenureBar } from '../lib/normalize-tenures'

export interface SegmentTenuresResult {
  segmentId: string
  countryId: string
  kind: PinnedSegment['kind']
  bars: TenureBar[]
  isLoading: boolean
  error: unknown
}

/**
 * 핀한 segment 각각에 대해 재임 기록을 병렬 조회.
 * MVP에선 통합 엔드포인트 없이 segment 수만큼 GET 호출 — react-query가 캐싱·dedup 처리.
 */
export function useSegmentTenures(segments: PinnedSegment[]): SegmentTenuresResult[] {
  const queries = useQueries({
    queries: segments.map((seg) => ({
      queryKey: ['heads-of-state', 'tenures', seg.kind, seg.countryId],
      queryFn: async () => {
        const params =
          seg.kind === 'COUNTRY'
            ? { countryId: seg.countryId }
            : { historicalCountryId: seg.countryId }
        const list = await personCareerApi.getTenuresByCountry(params)
        return normalizeTenures(list)
      },
      staleTime: 5 * 60 * 1000,
    })),
  })

  return segments.map((seg, idx) => {
    const q = queries[idx]
    return {
      segmentId: seg.segmentId,
      countryId: seg.countryId,
      kind: seg.kind,
      bars: (q?.data as TenureBar[] | undefined) ?? [],
      isLoading: q?.isLoading ?? false,
      error: q?.error ?? null,
    }
  })
}
