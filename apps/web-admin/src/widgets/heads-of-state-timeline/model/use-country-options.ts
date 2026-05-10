import { useMemo } from 'react'

import { useQuery } from '@tanstack/react-query'

import { getAllCountries } from '@/shared/api/countries'
import { getAllHistoricalCountries } from '@/shared/api/historical-countries'

import type { CountryKind, PinnedSegment } from './types'

/** 검색 모달에서 한 옵션 — 핀 추가 시 PinnedSegment로 그대로 변환됨 */
export interface CountryOption {
  optionId: string // 'C:<id>' or 'H:<id>'
  kind: CountryKind
  countryId: string
  name: string
  flagEmoji: string | null
  description: string | null
  /** 검색 시 fallback (한글명·영문명·ISO·full name 모두 부분 일치 검사) */
  searchKeywords: string[]
  isoCode: string | null
  lifespanStartYear: number | null
  lifespanEndYear: number | null
}

function eraYear(era: string | null | undefined, year: number | null | undefined) {
  if (year == null) return null
  return era === 'BC' ? -year : year
}

function formatRangeShort(
  startEra: string | null | undefined,
  startYear: number | null | undefined,
  endEra: string | null | undefined,
  endYear: number | null | undefined,
): string {
  const fmt = (era: string | null | undefined, y: number | null | undefined) => {
    if (y == null) return null
    return era === 'BC' ? `BC ${y}` : `${y}`
  }
  const s = fmt(startEra, startYear)
  const e = fmt(endEra, endYear)
  if (!s && !e) return ''
  if (s && e) return `${s} ~ ${e}`
  if (s) return `${s} ~`
  return `~ ${e}`
}

/**
 * 핀 추가 모달에서 쓸 통합 옵션 목록 (현대 + 역사적 국가).
 * 정렬: 한글 가나다순. 각 옵션 description엔 종류·시대를 짧게 표기해 검색 시 구분이 쉽게.
 *
 * `enabled`가 false면 fetch를 보류 — 모달이 열릴 때만 로드해 페이지 진입 시
 * 전체 국가 다운로드 비용을 피한다.
 */
export function useCountryOptions(enabled: boolean = true) {
  const modernQuery = useQuery({
    queryKey: ['heads-of-state', 'countries'],
    queryFn: getAllCountries,
    staleTime: 5 * 60 * 1000,
    enabled,
  })
  const historicalQuery = useQuery({
    queryKey: ['heads-of-state', 'historical-countries'],
    queryFn: getAllHistoricalCountries,
    staleTime: 5 * 60 * 1000,
    enabled,
  })

  const options: CountryOption[] = useMemo(() => {
    const modern: CountryOption[] = (modernQuery.data ?? []).map((c: any) => {
      const keywords = [c.name, c.fullName, c.localName, c.isoCode]
        .filter((s: any): s is string => typeof s === 'string' && s.length > 0)
        .map((s) => s.toLowerCase())
      return {
        optionId: `C:${c.id}`,
        kind: 'COUNTRY',
        countryId: c.id,
        name: c.name,
        flagEmoji: c.flagEmoji ?? null,
        description: c.fullName ? `현대 · ${c.fullName}` : '현대 국가',
        searchKeywords: keywords,
        isoCode: c.isoCode ?? null,
        lifespanStartYear: null,
        lifespanEndYear: null,
      }
    })
    const historical: CountryOption[] = (historicalQuery.data ?? []).map(
      (h: any) => {
        const range = formatRangeShort(h.startEra, h.startYear, h.endEra, h.endYear)
        const keywords = [h.name, h.englishName, h.localName, h.shortName]
          .filter((s: any): s is string => typeof s === 'string' && s.length > 0)
          .map((s) => s.toLowerCase())
        return {
          optionId: `H:${h.id}`,
          kind: 'HISTORICAL',
          countryId: h.id,
          name: h.name,
          flagEmoji: null,
          description: range ? `역사 · ${range}` : '역사 국가',
          searchKeywords: keywords,
          isoCode: null,
          lifespanStartYear: eraYear(h.startEra, h.startYear),
          lifespanEndYear: eraYear(h.endEra, h.endYear),
        }
      },
    )
    return [...modern, ...historical].sort((a, b) =>
      a.name.localeCompare(b.name, 'ko'),
    )
  }, [modernQuery.data, historicalQuery.data])

  return {
    options,
    isLoading: modernQuery.isLoading || historicalQuery.isLoading,
  }
}

export function optionToSegment(opt: CountryOption): Omit<PinnedSegment, 'segmentId'> {
  return {
    kind: opt.kind,
    countryId: opt.countryId,
    name: opt.name,
    flagEmoji: opt.flagEmoji,
    lifespanStartYear: opt.lifespanStartYear,
    lifespanEndYear: opt.lifespanEndYear,
  }
}

export { eraYear }
