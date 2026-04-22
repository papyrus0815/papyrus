/**
 * 국가 목록 상태 Context
 * - 검색/필터/정렬 상태와 함께 핵심 데이터(현대·역사·대륙)를 한 곳에서 제공
 * - 데이터는 `useHistoryCoreData` 훅을 provider가 내부에서 직접 fetch하여 prop drilling 제거
 * - 입력 시 페이지 전체 리렌더를 피하려고 Context로 격리
 */
import React, { useMemo, useState } from 'react'

import type { ContinentOption, Country } from '@/entities/country/api'
import type {
  CountryTypeFilter,
  UnifiedCountry,
} from '@/entities/country/model/unified-types'
import { historicalToUnified } from '@/entities/country/model/unified-types'
import type { HistoricalCountry } from '@/entities/historical-country/api'
import type { CountryResponseDto } from '@/shared/api/countries'
import { useHistoryCoreData } from '@/widgets/history-shell/model/use-history-core-data.hook'

export type SortBy = 'name' | 'population' | 'area'

export interface CountryListStateContextValue {
  // 필터/정렬
  query: string
  setQuery: (q: string) => void
  continentFilter: string
  setContinentFilter: (id: string) => void
  countryTypeFilter: CountryTypeFilter
  setCountryTypeFilter: (t: CountryTypeFilter) => void
  sortBy: SortBy
  setSortBy: (s: SortBy) => void
  // 계산된 목록
  filtered: UnifiedCountry[]
  // 핵심 데이터 (useHistoryCoreData 제공 값)
  countries: Country[]
  unifiedCountries: UnifiedCountry[]
  continents: ContinentOption[]
  apiHistoricalCountries: HistoricalCountry[] | undefined
  apiCountries: CountryResponseDto[] | undefined
  // 인물 등록 모달 (페이지 전역에서 열기)
  showPersonRegisterModal: boolean
  setShowPersonRegisterModal: (v: boolean) => void
}

const CountryListStateContext =
  React.createContext<CountryListStateContextValue | null>(null)

export function useCountryListState() {
  const ctx = React.useContext(CountryListStateContext)
  if (!ctx)
    throw new Error(
      'useCountryListState must be used within CountryListStateProvider',
    )
  return ctx
}

interface ProviderProps {
  children: React.ReactNode
}

export function CountryListStateProvider({ children }: ProviderProps) {
  const core = useHistoryCoreData()
  const { countries, unifiedCountries, continents, apiHistoricalCountries } =
    core

  const [query, setQuery] = useState('')
  const [continentFilter, setContinentFilter] = useState('')
  const [countryTypeFilter, setCountryTypeFilter] =
    useState<CountryTypeFilter>('all')
  const [sortBy, setSortBy] = useState<SortBy>('area')
  const [showPersonRegisterModal, setShowPersonRegisterModal] = useState(false)

  const filtered = useMemo(() => {
    const searchTextLower = query.trim().toLowerCase()

    if (countryTypeFilter === 'historical') {
      const fromApi = (apiHistoricalCountries ?? []).map((hc) =>
        historicalToUnified(hc as HistoricalCountry),
      )
      const seenIds = new Set(fromApi.map((c) => c.id))
      unifiedCountries.forEach((country) => {
        if (country.type === 'modern' && country.historicalCountries) {
          country.historicalCountries.forEach((hc) => {
            if (!seenIds.has(hc.id)) {
              seenIds.add(hc.id)
              fromApi.push(historicalToUnified(hc))
            }
          })
        }
      })
      const result = fromApi.filter(
        (country) =>
          !searchTextLower ||
          country.name.toLowerCase().includes(searchTextLower) ||
          (country.enName || '').toLowerCase().includes(searchTextLower),
      )
      return result.sort((a, b) => a.name.localeCompare(b.name, 'ko'))
    }

    const modernResult = unifiedCountries.filter((country) => {
      if (country.type !== 'modern') return false
      const matchSearch =
        !searchTextLower ||
        country.name.toLowerCase().includes(searchTextLower) ||
        (country.isoCode || '').toLowerCase().includes(searchTextLower) ||
        (country.capital || '').toLowerCase().includes(searchTextLower)
      const matchContinent =
        !continentFilter || country.continentId === continentFilter
      return matchSearch && matchContinent
    })

    // 검색어가 있을 때 역사적 국가도 함께 검색
    if (searchTextLower) {
      const seenIds = new Set<string>()
      const historicalMatches: UnifiedCountry[] = []

      ;(apiHistoricalCountries ?? []).forEach((hc) => {
        const unified = historicalToUnified(hc as HistoricalCountry)
        if (
          !seenIds.has(unified.id) &&
          (unified.name.toLowerCase().includes(searchTextLower) ||
            (unified.enName || '').toLowerCase().includes(searchTextLower))
        ) {
          seenIds.add(unified.id)
          historicalMatches.push(unified)
        }
      })

      unifiedCountries.forEach((country) => {
        if (country.type === 'modern' && country.historicalCountries) {
          country.historicalCountries.forEach((hc) => {
            const unified = historicalToUnified(hc)
            if (
              !seenIds.has(unified.id) &&
              (unified.name.toLowerCase().includes(searchTextLower) ||
                (unified.enName || '').toLowerCase().includes(searchTextLower))
            ) {
              seenIds.add(unified.id)
              historicalMatches.push(unified)
            }
          })
        }
      })

      const result = [...modernResult, ...historicalMatches]
      return result.sort((a, b) => a.name.localeCompare(b.name, 'ko'))
    }

    const result = modernResult

    return result.sort((countryA, countryB) => {
      if (sortBy === 'name')
        return countryA.name.localeCompare(countryB.name, 'ko')
      if (sortBy === 'population')
        return (
          (Number(countryB.population) || 0) - (Number(countryA.population) || 0)
        )
      if (sortBy === 'area')
        return (countryB.areaSqKm || 0) - (countryA.areaSqKm || 0)
      return 0
    })
  }, [
    unifiedCountries,
    apiHistoricalCountries,
    query,
    continentFilter,
    countryTypeFilter,
    sortBy,
  ])

  const value = useMemo<CountryListStateContextValue>(
    () => ({
      query,
      setQuery,
      continentFilter,
      setContinentFilter,
      countryTypeFilter,
      setCountryTypeFilter,
      sortBy,
      setSortBy,
      filtered,
      countries,
      unifiedCountries,
      continents,
      apiHistoricalCountries,
      apiCountries: core.apiCountries,
      showPersonRegisterModal,
      setShowPersonRegisterModal,
    }),
    [
      query,
      continentFilter,
      countryTypeFilter,
      sortBy,
      filtered,
      countries,
      unifiedCountries,
      continents,
      apiHistoricalCountries,
      core.apiCountries,
      showPersonRegisterModal,
    ],
  )

  return (
    <CountryListStateContext.Provider value={value}>
      {children}
    </CountryListStateContext.Provider>
  )
}
