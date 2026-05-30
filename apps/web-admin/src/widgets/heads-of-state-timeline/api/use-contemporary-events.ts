import { useMemo } from 'react'

import { useQuery } from '@tanstack/react-query'

import { getAllEvents } from '@/shared/api/events'

import { toJulianYear } from '../lib/time-scale'
import type { PinnedRow } from '../model/types'

export interface ContemporaryEvent {
  id: string
  title: string
  startDate: string
  endDate: string | null
  categoryName: string | null
  startYear: number
  endYear: number
}

/**
 * 동시대 패널에 띄울 "그 해의 사건" — 핀한 국가(현대·역사)로 스코프해 한 번 받아오고,
 * 강조 연도는 클라이언트에서 필터한다. 연도만 바뀌면 재요청 없이 같은 캐시를 다시 거른다.
 *
 * 사건이 [startYear, endYear]로 해당 연도를 포함하면 "그 시점에 진행 중"으로 본다
 * (단일 시점 사건은 그 해에만).
 */
export function useContemporaryEvents(rows: PinnedRow[], year: number | null) {
  const { countryIds, historicalCountryIds } = useMemo(() => {
    const c = new Set<string>()
    const h = new Set<string>()
    for (const row of rows) {
      for (const seg of row.segments) {
        if (seg.kind === 'COUNTRY') c.add(seg.countryId)
        else h.add(seg.countryId)
      }
    }
    return {
      countryIds: Array.from(c).sort(),
      historicalCountryIds: Array.from(h).sort(),
    }
  }, [rows])

  const hasCountries = countryIds.length > 0 || historicalCountryIds.length > 0

  const { data, isLoading } = useQuery({
    queryKey: [
      'heads-of-state',
      'contemporary-events',
      countryIds,
      historicalCountryIds,
    ],
    queryFn: () =>
      getAllEvents({
        countryIds: countryIds.length ? countryIds : undefined,
        historicalCountryIds: historicalCountryIds.length
          ? historicalCountryIds
          : undefined,
        limit: 1000,
      }),
    enabled: year != null && hasCountries,
    staleTime: 5 * 60 * 1000,
  })

  const all = useMemo<ContemporaryEvent[]>(() => {
    if (!Array.isArray(data)) return []
    const out: ContemporaryEvent[] = []
    for (const e of data as Array<Record<string, any>>) {
      if (!e?.startDate || typeof e.id !== 'string') continue
      const startYear = Math.floor(toJulianYear(e.startDate))
      const endYear = e.endDate ? Math.floor(toJulianYear(e.endDate)) : startYear
      out.push({
        id: e.id,
        title: e.title ?? '(제목 없음)',
        startDate: e.startDate,
        endDate: e.endDate ?? null,
        categoryName: e?.category?.name ?? e?.eventCategory?.name ?? null,
        startYear,
        endYear,
      })
    }
    return out
  }, [data])

  const events = useMemo(() => {
    if (year == null) return []
    return all
      .filter((e) => e.startYear <= year && year <= e.endYear)
      .sort((a, b) => a.startDate.localeCompare(b.startDate))
  }, [all, year])

  return { events, isLoading: isLoading && hasCountries && year != null }
}
