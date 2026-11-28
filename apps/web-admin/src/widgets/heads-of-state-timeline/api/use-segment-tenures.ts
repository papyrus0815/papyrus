import { useRef } from 'react'

import { useQueries } from '@tanstack/react-query'

import { personCareerApi } from '@/shared/api/person-career'
import {
  listPoliticalSystems,
  type PoliticalSystem,
} from '@/shared/api/political-system'

import type { PinnedSegment } from '../model/types'
import { normalizeTenures, type TenureBar } from '../lib/normalize-tenures'

export interface SegmentTenuresResult {
  segmentId: string
  countryId: string
  kind: PinnedSegment['kind']
  bars: TenureBar[]
  politicalSystems?: PoliticalSystem[]
  isLoading: boolean
  error: unknown
}

/** 로딩·미해결 segment가 공유하는 안정 빈 배열 — bars 참조가 흔들리지 않게 한다 */
const EMPTY_BARS: TenureBar[] = []
const EMPTY_SYSTEMS: PoliticalSystem[] = []

interface CacheEntry {
  data: TenureBar[] | undefined
  systems: PoliticalSystem[] | undefined
  isLoading: boolean
  error: unknown
  result: SegmentTenuresResult
}

/**
 * 핀한 segment 각각에 대해 재임 기록을 병렬 조회.
 * MVP에선 통합 엔드포인트 없이 segment 수만큼 GET 호출 — react-query가 캐싱·dedup 처리.
 *
 * react-query의 `data`는 변경이 없는 한 참조가 안정적이므로, 그 참조를 키로 결과 객체를
 * segmentId별로 캐싱한다. 이렇게 해야 팬·줌으로 부모가 매 프레임 리렌더돼도 결과 객체 참조가
 * 유지되어 하위 `TimelineRow`의 레인 패킹 메모가 깨지지 않는다.
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

  const systemQueries = useQueries({
    queries: segments.map((seg) => ({
      queryKey: ['heads-of-state', 'political-systems', seg.kind, seg.countryId],
      queryFn: async () => {
        const scope =
          seg.kind === 'COUNTRY'
            ? { countryId: seg.countryId }
            : { historicalCountryId: seg.countryId }
        return listPoliticalSystems(scope).catch(() => EMPTY_SYSTEMS)
      },
      staleTime: 5 * 60 * 1000,
    })),
  })

  const cacheRef = useRef(new Map<string, CacheEntry>())

  return segments.map((seg, idx) => {
    const q = queries[idx]
    const sysQ = systemQueries[idx]
    const data = q?.data as TenureBar[] | undefined
    const systems = sysQ?.data as PoliticalSystem[] | undefined
    const isLoading = q?.isLoading ?? false
    const error = q?.error ?? null

    const cached = cacheRef.current.get(seg.segmentId)
    if (
      cached &&
      cached.data === data &&
      cached.systems === systems &&
      cached.isLoading === isLoading &&
      cached.error === error &&
      cached.result.countryId === seg.countryId &&
      cached.result.kind === seg.kind
    ) {
      return cached.result
    }

    const result: SegmentTenuresResult = {
      segmentId: seg.segmentId,
      countryId: seg.countryId,
      kind: seg.kind,
      bars: data ?? EMPTY_BARS,
      politicalSystems: systems ?? EMPTY_SYSTEMS,
      isLoading,
      error,
    }
    cacheRef.current.set(seg.segmentId, { data, systems, isLoading, error, result })
    return result
  })
}
