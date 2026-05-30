/**
 * 핀한 행의 "계보 펼치기" 후보 계산 — 모던 국가에 연결된 역사적 전신 국가들을 모아
 * 아직 그 행에 없는 것만 segment 후보로 돌려준다.
 *
 * 연결 정보는 `HistoricalCountryModernCountry` 기반의 `GET /countries/:id/historical-countries`로
 * **ID만** 받고, 이름·국기·lifespan은 이미 로드된 useCountryOptions 옵션에서 조회한다
 * (페이지 전체와 동일한 정규화 사용 → 일관성, 추가 fetch 없음).
 *
 * 행별로 hook을 부를 수 없으므로 부모에서 useQueries로 모던 국가별 한 번에 조회한다.
 */
import { useMemo } from 'react'

import { useQueries } from '@tanstack/react-query'
import * as historicalCountriesApi from '@api/functional/countries/historical_countries'

import { getApiConnection } from '@/shared/api/client'

import { optionToSegment, useCountryOptions } from '../model/use-country-options'
import type { PinnedRow, PinnedSegment } from '../model/types'

async function fetchLinkedHistoricalIds(modernCountryId: string): Promise<string[]> {
  const res = (await historicalCountriesApi.getHistoricalCountriesByModernCountryId(
    getApiConnection(),
    modernCountryId,
  )) as { data?: unknown } | unknown
  const list = (res as { data?: unknown })?.data ?? res
  if (!Array.isArray(list)) return []
  return list
    .map((h) => (h as { id?: unknown })?.id)
    .filter((id): id is string => typeof id === 'string')
}

export function useRowsLineage(rows: PinnedRow[]) {
  const { options } = useCountryOptions(true)
  const optionByKey = useMemo(
    () => new Map(options.map((o) => [`${o.kind}:${o.countryId}`, o])),
    [options],
  )

  // 행에 등장하는 모던 국가 id 모음 — 각각의 연결 역사국가를 조회한다
  const modernCountryIds = useMemo(() => {
    const s = new Set<string>()
    for (const r of rows) {
      for (const seg of r.segments) {
        if (seg.kind === 'COUNTRY') s.add(seg.countryId)
      }
    }
    return Array.from(s).sort()
  }, [rows])

  const queries = useQueries({
    queries: modernCountryIds.map((id) => ({
      queryKey: ['countries', id, 'historical-countries'],
      queryFn: () => fetchLinkedHistoricalIds(id),
      staleTime: 5 * 60 * 1000,
    })),
  })

  const lineageByModernId = useMemo(() => {
    const m = new Map<string, string[]>()
    modernCountryIds.forEach((id, i) => {
      const data = queries[i]?.data
      if (Array.isArray(data)) m.set(id, data)
    })
    return m
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modernCountryIds, queries.map((q) => q.data).join('|')])

  /** 이 행 모던 국가의 계보(연결된 역사 전신국가) id 집합. */
  const lineageHistIdsForRow = (row: PinnedRow): Set<string> => {
    const ids = new Set<string>()
    for (const seg of row.segments) {
      if (seg.kind !== 'COUNTRY') continue
      for (const hid of lineageByModernId.get(seg.countryId) ?? []) ids.add(hid)
    }
    return ids
  }

  /** 이 행에 더 펼칠 수 있는 계보(아직 안 핀된 역사 전신국가) segment 후보. */
  const expandableForRow = (
    row: PinnedRow,
  ): Array<Omit<PinnedSegment, 'segmentId'>> => {
    const lineageIds = lineageHistIdsForRow(row)
    const pinned = new Set(row.segments.map((s) => s.countryId))
    const out: Array<Omit<PinnedSegment, 'segmentId'>> = []
    for (const hid of lineageIds) {
      if (pinned.has(hid)) continue
      const opt = optionByKey.get(`HISTORICAL:${hid}`)
      if (!opt) continue
      out.push(optionToSegment(opt))
      pinned.add(hid)
    }
    return out
  }

  /** 이미 펼쳐진 계보 — 닫기로 제거할 역사 segment id 목록 (모던 국가는 보존). */
  const collapsibleSegmentIdsForRow = (row: PinnedRow): string[] => {
    const lineageIds = lineageHistIdsForRow(row)
    return row.segments
      .filter((s) => s.kind === 'HISTORICAL' && lineageIds.has(s.countryId))
      .map((s) => s.segmentId)
  }

  return { expandableForRow, collapsibleSegmentIdsForRow }
}
