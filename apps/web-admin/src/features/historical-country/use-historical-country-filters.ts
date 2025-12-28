/**
 * 역사적 국가 필터링 및 정렬 Hook
 *
 * @description
 * 역사적 국가 목록을 검색, 필터링, 정렬하는 기능을 제공합니다.
 *
 * @features
 * - 검색: 이름, 영문명, 설명으로 검색
 * - 필터: 국가 형태(제국, 왕국, 공화국 등)별 필터링
 * - 정렬: 이름순, 시작일순, 존속기간순 정렬
 * - 통계: 국가 형태별 카운트 제공
 *
 * @usage
 * - pages/history/historical-country/historical-country.page.tsx
 *
 * @example
 * ```tsx
 * const { data: countries } = useHistoricalCountries()
 * const {
 *   filtered,
 *   query, setQuery,
 *   stateTypeFilter, setStateTypeFilter,
 *   sortBy, setSortBy,
 *   countByStateType
 * } = useHistoricalCountryFilters({ countries: countries || [] })
 * ```
 */

import { useState, useMemo } from 'react'
import type {
  HistoricalCountry,
  HistoricalStateType,
} from '@/entities/historical-country/api'

export type SortBy = 'name' | 'startDate' | 'duration'

interface UseHistoricalCountryFiltersProps {
  countries: HistoricalCountry[]
}

/**
 * 역사적 국가 필터링 및 정렬 Hook
 *
 * @param {HistoricalCountry[]} countries - 필터링할 역사적 국가 목록
 * @returns {Object} 필터링 상태 및 필터링된 결과
 *
 * @example
 * ```tsx
 * const { filtered, query, setQuery } = useHistoricalCountryFilters({
 *   countries: [
 *     { name: '조선', stateType: 'KINGDOM', startDate: '1392-07-17', ... },
 *     { name: '고려', stateType: 'KINGDOM', startDate: '918-06-01', ... }
 *   ]
 * })
 *
 * // 검색
 * setQuery('조선')  // filtered: [{ name: '조선', ... }]
 *
 * // 필터
 * setStateTypeFilter('KINGDOM')  // 왕국만 표시
 *
 * // 정렬
 * setSortBy('startDate')  // 시작일 최신순
 * ```
 */
export function useHistoricalCountryFilters({
  countries,
}: UseHistoricalCountryFiltersProps) {
  const [query, setQuery] = useState('')
  const [stateTypeFilter, setStateTypeFilter] = useState<
    HistoricalStateType | 'ALL'
  >('ALL')
  const [sortBy, setSortBy] = useState<SortBy>('startDate')
  const [showStateTypeModal, setShowStateTypeModal] = useState(false)
  const [showSortModal, setShowSortModal] = useState(false)

  /**
   * 필터링 및 정렬된 국가 목록
   *
   * @description
   * 1. 검색어로 필터링 (이름, 영문명, 설명)
   * 2. 국가 형태로 필터링
   * 3. 선택된 기준으로 정렬
   */
  const filtered = useMemo(() => {
    const searchTextLower = query.trim().toLowerCase()
    const result = countries.filter((country) => {
      const matchSearch =
        !searchTextLower ||
        country.name.toLowerCase().includes(searchTextLower) ||
        (country.enName &&
          country.enName.toLowerCase().includes(searchTextLower)) ||
        (country.description || '').toLowerCase().includes(searchTextLower)

      const matchStateType =
        stateTypeFilter === 'ALL' || country.stateType === stateTypeFilter

      return matchSearch && matchStateType
    })

    // 정렬
    return result.sort((countryA, countryB) => {
      if (sortBy === 'name') {
        return countryA.name.localeCompare(countryB.name, 'ko')
      } else if (sortBy === 'startDate') {
        // 최신순 (startYear 기준)
        const yearA = countryA.startYear || 0
        const yearB = countryB.startYear || 0
        return yearB - yearA
      } else if (sortBy === 'duration') {
        // 존속 기간 긴 순
        const getDuration = (country: HistoricalCountry) => {
          if (!country.startYear || !country.endYear) return 0
          return country.endYear - country.startYear
        }
        return getDuration(countryB) - getDuration(countryA)
      }
      return 0
    })
  }, [countries, query, stateTypeFilter, sortBy])

  /**
   * 국가 형태별 통계
   *
   * @description
   * 각 국가 형태(제국, 왕국, 공화국 등)별 개수를 계산합니다.
   *
   * @example
   * ```tsx
   * // countByStateType = { EMPIRE: 5, KINGDOM: 12, REPUBLIC: 3, ... }
   * ```
   */
  const countByStateType = useMemo(() => {
    const counts: Record<string, number> = {}
    countries.forEach((country) => {
      counts[country.stateType] = (counts[country.stateType] || 0) + 1
    })

    return counts
  }, [countries])

  return {
    // States
    query,
    setQuery,
    stateTypeFilter,
    setStateTypeFilter,
    sortBy,
    setSortBy,
    showStateTypeModal,
    setShowStateTypeModal,
    showSortModal,
    setShowSortModal,

    // Computed
    filtered,
    countByStateType,
  }
}
