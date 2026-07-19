/**
 * 국가 목록 상태 Context
 * - 검색/필터/정렬 상태와 함께 핵심 데이터(현대·역사·대륙)를 한 곳에서 제공
 * - 데이터는 `useContentCoreData` 훅을 provider가 내부에서 직접 fetch하여 prop drilling 제거
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
import { useContentCoreData } from '@/widgets/content-shell/model/use-content-core-data.hook'

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
  /** 역사국가 총 개수 — '전체' 필터에서 존재를 알리는 카운트 배지용 (F37) */
  historicalCount: number
  /** 브리지(현대 국가 연결)가 없는 역사국가 id — 행 '연결 안 됨' 배지 근거 (F37) */
  unlinkedHistoricalIds: Set<string>
  // 핵심 데이터 (useContentCoreData 제공 값)
  countries: Country[]
  unifiedCountries: UnifiedCountry[]
  continents: ContinentOption[]
  apiHistoricalCountries: HistoricalCountry[] | undefined
  apiCountries: CountryResponseDto[] | undefined
  isLoading: boolean
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
  const core = useContentCoreData()
  const {
    countries,
    unifiedCountries,
    continents,
    apiHistoricalCountries,
    isLoading,
  } = core

  const [query, setQuery] = useState('')
  const [continentFilter, setContinentFilter] = useState('')
  const [countryTypeFilter, setCountryTypeFilter] =
    useState<CountryTypeFilter>('all')
  const [sortBy, setSortBy] = useState<SortBy>('area')
  const [showPersonRegisterModal, setShowPersonRegisterModal] = useState(false)

  /**
   * 역사국가 통합 목록 — API 목록 + 현대 국가에 딸린 경량 항목을 id로 dedup.
   * '과거' 필터·검색 합류·카운트 배지가 모두 같은 재료를 쓰도록 한 번만 만든다
   * (검색어 입력마다 193건을 다시 변환하던 중복 제거).
   */
  const historicalUnified = useMemo<UnifiedCountry[]>(() => {
    const byId = new Map<string, UnifiedCountry>()
    ;(apiHistoricalCountries ?? []).forEach((hc) => {
      if (!byId.has(hc.id))
        byId.set(hc.id, historicalToUnified(hc as HistoricalCountry))
    })
    unifiedCountries.forEach((country) => {
      if (country.type !== 'modern' || !country.historicalCountries) return
      country.historicalCountries.forEach((hc) => {
        if (!byId.has(hc.id)) byId.set(hc.id, historicalToUnified(hc))
      })
    })
    return Array.from(byId.values())
  }, [apiHistoricalCountries, unifiedCountries])

  /**
   * 브리지가 없는 역사국가 id 집합 (F37).
   * - 현대 국가 응답에 딸려 내려온 항목은 정의상 연결됨
   * - API 목록 항목은 parentModernCountryIds가 비어 있으면 미연결
   * 미연결 국가는 현대 행 chevron 트리에 아예 나타나지 않으므로 배지로 저작을 유도한다.
   */
  const unlinkedHistoricalIds = useMemo<Set<string>>(() => {
    const bridgedIds = new Set<string>()
    unifiedCountries.forEach((country) => {
      if (country.type !== 'modern' || !country.historicalCountries) return
      country.historicalCountries.forEach((hc) => bridgedIds.add(hc.id))
    })
    const unlinked = new Set<string>()
    ;(apiHistoricalCountries ?? []).forEach((hc) => {
      if (bridgedIds.has(hc.id)) return
      const parentIds = (hc as { parentModernCountryIds?: string[] })
        .parentModernCountryIds
      if (!parentIds || parentIds.length === 0) unlinked.add(hc.id)
    })
    return unlinked
  }, [apiHistoricalCountries, unifiedCountries])

  const filtered = useMemo(() => {
    const searchTextLower = query.trim().toLowerCase()
    const matchesHistoricalSearch = (country: UnifiedCountry) =>
      !searchTextLower ||
      country.name.toLowerCase().includes(searchTextLower) ||
      (country.enName || '').toLowerCase().includes(searchTextLower)

    if (countryTypeFilter === 'historical') {
      return historicalUnified
        .filter(matchesHistoricalSearch)
        .sort((left, right) => left.name.localeCompare(right.name, 'ko'))
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
      const result = [
        ...modernResult,
        ...historicalUnified.filter(matchesHistoricalSearch),
      ]
      return result.sort((left, right) => left.name.localeCompare(right.name, 'ko'))
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
    historicalUnified,
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
      historicalCount: historicalUnified.length,
      unlinkedHistoricalIds,
      countries,
      unifiedCountries,
      continents,
      apiHistoricalCountries,
      apiCountries: core.apiCountries,
      isLoading,
      showPersonRegisterModal,
      setShowPersonRegisterModal,
    }),
    [
      query,
      continentFilter,
      countryTypeFilter,
      sortBy,
      filtered,
      historicalUnified,
      unlinkedHistoricalIds,
      countries,
      unifiedCountries,
      continents,
      apiHistoricalCountries,
      core.apiCountries,
      isLoading,
      showPersonRegisterModal,
    ],
  )

  return (
    <CountryListStateContext.Provider value={value}>
      {children}
    </CountryListStateContext.Provider>
  )
}
