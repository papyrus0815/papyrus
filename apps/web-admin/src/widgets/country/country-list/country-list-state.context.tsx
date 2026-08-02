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

import { compareBySort, type SortBy } from './model/sort-countries'

export type { SortBy }

export interface CountryListStateContextValue {
  // 필터/정렬
  query: string
  setQuery: (query: string) => void
  continentFilter: string
  setContinentFilter: (id: string) => void
  countryTypeFilter: CountryTypeFilter
  setCountryTypeFilter: (t: CountryTypeFilter) => void
  sortBy: SortBy
  setSortBy: (sort: SortBy) => void
  // 계산된 목록
  filtered: UnifiedCountry[]
  /** 역사국가 총 개수 — '전체' 필터에서 존재를 알리는 카운트 배지용 (F37) */
  historicalCount: number
  /** 브리지(현대 국가 연결)가 없는 역사국가 id — 행 '연결 안 됨' 배지 근거 (F37) */
  unlinkedHistoricalIds: Set<string>
  // 핵심 데이터 (useContentCoreData 제공 값)
  countries: Country[]
  unifiedCountries: UnifiedCountry[]
  /** 모든 국가(현대+역사+하위역사) id→UnifiedCountry 인덱스 — 핀/최근 O(1) 조회용 (F5) */
  countriesById: Map<string, UnifiedCountry>
  continents: ContinentOption[]
  apiHistoricalCountries: HistoricalCountry[] | undefined
  apiCountries: CountryResponseDto[] | undefined
  isLoading: boolean
  /** 현대 국가 쿼리 로딩 여부 — '전체'/'현대' 스켈레톤 게이트용 (G1-3) */
  isLoadingCountries: boolean
  /** 역사 국가 쿼리 로딩 여부 — '과거' 스켈레톤 게이트용 (G1-3) */
  isLoadingHistorical: boolean
  /** 대륙 쿼리 로딩 여부 — 대륙 그룹핑 준비 판정용 (F4) */
  isLoadingContinents: boolean
  /** 현대·역사 목록 중 하나라도 에러 (부분 실패 포함) — 빈 상태 위장 방지 (G1-1) */
  isError: boolean
  /** 현대 국가 목록 쿼리 에러 (G1-1) */
  isErrorCountries: boolean
  /** 역사 국가 목록 쿼리 에러 — '과거'·검색 합류의 부분 결손 신호 (G1-2) */
  isErrorHistorical: boolean
  /** 두 목록 쿼리 재조회 (에러 재시도) */
  refetchAll: () => void
  // 인물 등록 모달 (페이지 전역에서 열기)
  showPersonRegisterModal: boolean
  setShowPersonRegisterModal: (value: boolean) => void
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
    countriesById,
    continents,
    apiHistoricalCountries,
    isLoading,
    isLoadingCountries,
    isLoadingHistorical,
    isLoadingContinents,
    isError,
    isErrorCountries,
    isErrorHistorical,
    refetchAll,
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
    const compare = compareBySort(sortBy)
    const matchesHistoricalSearch = (country: UnifiedCountry) =>
      !searchTextLower ||
      country.name.toLowerCase().includes(searchTextLower) ||
      (country.enName || '').toLowerCase().includes(searchTextLower)

    // '과거' 필터 — 역사 국가만. 대륙 필터는 역사 국가에 continentId가 없어
    // 무의미하므로 무시한다(필터 UI에서 대륙 셀렉트 비활성). 정렬은 공용 비교자 경유.
    if (countryTypeFilter === 'historical') {
      return historicalUnified.filter(matchesHistoricalSearch).sort(compare)
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

    // 검색 중 역사 국가 합류는 '전체' 유형 + 대륙 미지정일 때만 (F3):
    // - 유형='현대'를 명시했으면 과거 국가를 섞지 않는다(계약 준수).
    // - 대륙 필터 활성 시 역사 국가는 대륙 소속이 없어 제외되어야 한다.
    const shouldMergeHistorical =
      !!searchTextLower && countryTypeFilter === 'all' && !continentFilter

    const combined = shouldMergeHistorical
      ? [...modernResult, ...historicalUnified.filter(matchesHistoricalSearch)]
      : modernResult

    // 정렬은 항상 sortBy를 반영 — 검색 시 무음으로 이름순으로 바뀌던 문제 제거(F3).
    return combined.sort(compare)
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
      countriesById,
      continents,
      apiHistoricalCountries,
      apiCountries: core.apiCountries,
      isLoading,
      isLoadingCountries,
      isLoadingHistorical,
      isLoadingContinents,
      isError,
      isErrorCountries,
      isErrorHistorical,
      refetchAll,
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
      countriesById,
      continents,
      apiHistoricalCountries,
      core.apiCountries,
      isLoading,
      isLoadingCountries,
      isLoadingHistorical,
      isLoadingContinents,
      isError,
      isErrorCountries,
      isErrorHistorical,
      refetchAll,
      showPersonRegisterModal,
    ],
  )

  return (
    <CountryListStateContext.Provider value={value}>
      {children}
    </CountryListStateContext.Provider>
  )
}
