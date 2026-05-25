/**
 * /history/* 전역에서 공유되는 핵심 데이터 fetch + 변환.
 *
 * - 현대 국가 / 역사 국가 / 대륙을 한 번만 fetch
 * - BigInt → Number 변환, null → undefined 변환
 * - 역사 국가 목록을 최신순 정렬
 *
 * 기존 country.page.tsx에 100줄 이상 흩어져 있던 데이터 변환을 한 곳에 모음.
 */
import { useMemo } from 'react'

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

interface HistoryCoreData {
  /** 로컬 Country 타입으로 변환된 현대 국가 목록 (하위 역사 국가는 최신순 정렬) */
  countries: Country[]
  /** 현대 국가 + (옵션) 역사 국가를 통합한 목록 */
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
  isLoading: boolean
}

export function useContentCoreData(): HistoryCoreData {
  const { data: apiCountries, isLoading: isLoadingCountries } = useCountries()
  const { data: apiHistoricalCountries, isLoading: isLoadingHistorical } =
    useHistoricalCountries()
  const { data: apiContinents } = useContinents()

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
      historicalCountries: (country.historicalCountries || []).sort(
        (a: HistoricalCountry, b: HistoricalCountry) => {
          const aYear = a.endYear || a.startYear || 0
          const bYear = b.endYear || b.startYear || 0
          return bYear - aYear
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

  return {
    countries,
    unifiedCountries,
    countriesById,
    continents,
    apiHistoricalCountries,
    apiCountries,
    isLoading: isLoadingCountries || isLoadingHistorical,
  }
}
