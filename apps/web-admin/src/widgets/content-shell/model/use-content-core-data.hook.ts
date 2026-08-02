/**
 * /history/* 전역에서 공유되는 핵심 데이터 fetch + 변환.
 *
 * - 현대 국가 / 역사 국가 / 대륙을 한 번만 fetch
 * - BigInt → Number 변환, null → undefined 변환
 * - 역사 국가 목록을 최신순 정렬
 *
 * 기존 country.page.tsx에 100줄 이상 흩어져 있던 데이터 변환을 한 곳에 모음.
 */
import { useCallback, useMemo } from 'react'

import { type ContinentOption, type Country } from '@/entities/country/api'
import {
  type UnifiedCountry,
  historicalToUnified,
  modernToUnified,
} from '@/entities/country/model/unified-types'
import type { HistoricalCountry } from '@/entities/historical-country/api'
import { useContinents } from '@/features/continent/use-continents.hook'
import { useCountries } from '@/features/country/api'
import { useHistoricalCountries } from '@/features/historical-country'
import { toSignedYear } from '@/shared/lib/country-period'

interface HistoryCoreData {
  /** 로컬 Country 타입으로 변환된 현대 국가 목록 (하위 역사 국가는 최신순 정렬) */
  countries: Country[]
  /** 현대 국가만 통합 타입으로 변환한 목록 (역사 국가는 apiHistoricalCountries·countriesById로 접근) */
  unifiedCountries: UnifiedCountry[]
  /**
   * 모든 국가(현대 + 역사 + 현대의 하위 역사 국가)에 대한 ID → UnifiedCountry 인덱스.
   * 상세 페이지 진입 시 O(1) 조회를 위해 제공된다.
   */
  countriesById: Map<string, UnifiedCountry>
  /** Select·Filter용 대륙 옵션 */
  continents: ContinentOption[]
  /** Raw 역사 국가 API 응답 (CountryListStateProvider가 historical 필터 시 참조) */
  apiHistoricalCountries: HistoricalCountry[] | undefined
  /** Raw 현대 국가 API 응답 (페이지에서 CRUD 처리 시 참조) */
  apiCountries: ReturnType<typeof useCountries>['data']
  /** 현대·역사 목록 중 하나라도 로딩 중 (기존 집계 신호 — 셸의 초기 로딩 판정 등) */
  isLoading: boolean
  /** 현대 국가 쿼리 로딩 여부 — 필터별 스켈레톤 게이트용 */
  isLoadingCountries: boolean
  /** 역사 국가 쿼리 로딩 여부 — '과거' 필터 스켈레톤 게이트용 */
  isLoadingHistorical: boolean
  /** 대륙 쿼리 로딩 여부 — 대륙 그룹핑 준비 전 판정용 */
  isLoadingContinents: boolean
  /** 현대·역사 목록 중 하나라도 에러 (부분 실패 포함) — 빈 상태 위장 방지 */
  isError: boolean
  /** 현대 국가 목록 쿼리 에러 */
  isErrorCountries: boolean
  /** 역사 국가 목록 쿼리 에러 — '과거' 필터·검색 합류의 부분 결손 신호 */
  isErrorHistorical: boolean
  /** 두 목록 쿼리 재조회 (에러 재시도) */
  refetchAll: () => void
}

export function useContentCoreData(): HistoryCoreData {
  const {
    data: apiCountries,
    isLoading: isLoadingCountries,
    isError: isErrorCountries,
    refetch: refetchCountries,
  } = useCountries()
  const {
    data: apiHistoricalCountries,
    isLoading: isLoadingHistorical,
    isError: isErrorHistorical,
    refetch: refetchHistorical,
  } = useHistoricalCountries()
  const { data: apiContinents, isLoading: isLoadingContinents } =
    useContinents()

  const countries = useMemo<Country[]>(() => {
    if (!apiCountries) return []
    return apiCountries.map((country) => ({
      id: country.id,
      name: country.name,
      fullName: (country as { fullName?: string }).fullName ?? undefined,
      localName: country.localName || undefined,
      isoCode: country.isoCode || undefined,
      flagEmoji: country.flagEmoji || undefined,
      capital: country.capital || undefined,
      population: country.population ? Number(country.population) : undefined,
      areaSqKm: country.areaSqKm ? Number(country.areaSqKm) : undefined,
      thumbnailUrl: country.thumbnailUrl || undefined,
      latitude: country.latitude || undefined,
      longitude: country.longitude || undefined,
      currencyId: country.currencyId || undefined,
      languageId: country.languageId || undefined,
      continentId: country.continentId || undefined,
      defaultNameDisplayOrder:
        (country as { defaultNameDisplayOrder?: 'korean' | 'western' | null })
          .defaultNameDisplayOrder ?? undefined,
      // react-query 캐시 소유 배열을 제자리 정렬하면 안 됨 — 사본을 만들어 정렬(G2-1).
      // 캐시는 서버 순서를 유지해 타 소비처의 순서 비결정성·refetch 시 스퓨리어스 리렌더를 막는다.
      // 최신순 정렬은 부호 연도(BC 음수) 기준 — 원시 endYear 비교는 BC 국가를 뒤집는다(F6).
      historicalCountries: [...(country.historicalCountries ?? [])].sort(
        (first, second) => {
          const firstYear =
            toSignedYear(first.endEra, first.endYear) ??
            toSignedYear(first.startEra, first.startYear)
          const secondYear =
            toSignedYear(second.endEra, second.endYear) ??
            toSignedYear(second.startEra, second.startYear)
          if (firstYear == null && secondYear == null) return 0
          if (firstYear == null) return 1 // 미상은 뒤로
          if (secondYear == null) return -1
          return secondYear - firstYear // 최신(큰 부호연도)이 먼저
        },
      ),
    }))
  }, [apiCountries])

  const unifiedCountries = useMemo<UnifiedCountry[]>(
    () => countries.map(modernToUnified),
    [countries],
  )

  const continents = useMemo<ContinentOption[]>(() => {
    if (!apiContinents) return []
    return apiContinents.map((cont) => ({ id: cont.id, name: cont.name }))
  }, [apiContinents])

  // 모든 국가 ID → UnifiedCountry 인덱스 (현대, raw 역사, 현대의 하위 역사 모두 포함)
  const countriesById = useMemo<Map<string, UnifiedCountry>>(() => {
    const map = new Map<string, UnifiedCountry>()
    for (const country of unifiedCountries) {
      map.set(country.id, country)
      if (country.type === 'modern' && country.historicalCountries) {
        for (const hc of country.historicalCountries) {
          if (!map.has(hc.id)) map.set(hc.id, historicalToUnified(hc))
        }
      }
    }
    if (apiHistoricalCountries) {
      for (const hc of apiHistoricalCountries) {
        if (!map.has(hc.id)) map.set(hc.id, historicalToUnified(hc))
      }
    }
    return map
  }, [unifiedCountries, apiHistoricalCountries])

  const refetchAll = useCallback(() => {
    void refetchCountries()
    void refetchHistorical()
  }, [refetchCountries, refetchHistorical])

  return {
    countries,
    unifiedCountries,
    countriesById,
    continents,
    apiHistoricalCountries,
    apiCountries,
    isLoading: isLoadingCountries || isLoadingHistorical,
    isLoadingCountries,
    isLoadingHistorical,
    isLoadingContinents,
    isError: isErrorCountries || isErrorHistorical,
    isErrorCountries,
    isErrorHistorical,
    refetchAll,
  }
}
