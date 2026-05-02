/**
 * Event Filters Feature - Filter Logic Hook
 * FSD: features/event-filters/model
 */
import { useMemo, useState } from 'react'

import type { CenturyFilter, FilterChip } from '@/entities/event/model'
import {
  FILTER_ALL,
  SORT_OPTIONS,
  type SortOption,
} from '@/features/event-list/lib'
import type { CountryResponseDto } from '@/shared/api/countries'
import type { EventCategoryDto } from '@/shared/api/event-categories'
import type { HistoricalCountryResponseDto } from '@/shared/api/historical-countries'

import type { HistoricalEvent } from '../../../pages/events/create/events.types'
import { MOCK_POSITION_TYPES } from '../../../entities/event/model/mock-government-positions'
import { getCenturyFromDate } from '../../../pages/events/utils/events.utils'

/**
 * countries / historicalCountries는 `filterSummaryChips`의 국가명 lookup에 사용.
 * 미전달 시 events에서 fallback으로 찾으나 비용이 N(events) — 가능하면 전달 권장.
 */
export const useEventFilters = (
  events: HistoricalEvent[],
  dbCategories: EventCategoryDto[],
  countries: CountryResponseDto[] = [],
  historicalCountries: HistoricalCountryResponseDto[] = [],
) => {
  // ===== 필터 상태 =====
  const [selectedCategory, setSelectedCategory] = useState<
    typeof FILTER_ALL | string
  >(FILTER_ALL)
  const [keyword, setKeyword] = useState('')
  const [sortBy, setSortBy] = useState<SortOption>(SORT_OPTIONS.RECENT)
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')
  const [selectedCentury, setSelectedCentury] =
    useState<CenturyFilter>(FILTER_ALL)
  const [selectedCountry, setSelectedCountry] = useState<
    typeof FILTER_ALL | string
  >(FILTER_ALL)
  const [selectedPositionType, setSelectedPositionType] = useState<
    typeof FILTER_ALL | string
  >(FILTER_ALL)
  const [showFlatView, setShowFlatView] = useState(false)

  // ===== 사용 가능한 필터 옵션 =====
  const availableCountries = useMemo(() => {
    const countries = new Set<string>()
    events.forEach((event) => {
      event.countries.forEach((country) => countries.add(country.name))
    })
    return Array.from(countries).sort((countryA, countryB) =>
      countryA.localeCompare(countryB, 'ko'),
    )
  }, [events])

  const availableCenturies = useMemo(() => {
    const centuries = new Set<number>()
    events.forEach((event) => {
      const startCentury = getCenturyFromDate(event.startDate)
      const endCentury = getCenturyFromDate(event.endDate)
      if (startCentury) centuries.add(startCentury)
      if (endCentury) centuries.add(endCentury)
    })
    return Array.from(centuries).sort((a, b) => a - b)
  }, [events])

  // ===== 필터링된 이벤트 =====
  const trimmedKeyword = keyword.trim()
  const normalizedKeyword = trimmedKeyword.toLowerCase()

  const filteredEvents = useMemo(() => {
    // ✅ 부모 이벤트만 필터링 (parentEventId가 없는 것만)
    return events
      .filter((event) => !event.parentEventId)
      .filter((event) => {
        const categoryOk =
          selectedCategory === FILTER_ALL || event.category === selectedCategory
        const keywordOk =
          normalizedKeyword.length === 0 ||
          event.title.toLowerCase().includes(normalizedKeyword) ||
          event.description.toLowerCase().includes(normalizedKeyword) ||
          event.tags.some((tag) =>
            tag.toLowerCase().includes(normalizedKeyword),
          )
        const centuryOk = (() => {
          if (selectedCentury === FILTER_ALL) return true
          const startCentury = getCenturyFromDate(event.startDate)
          const endCentury = getCenturyFromDate(event.endDate)
          return (
            startCentury === selectedCentury || endCentury === selectedCentury
          )
        })()
        const countryOk =
          selectedCountry === FILTER_ALL ||
          event.relatedCountries?.some((c) => c.id === selectedCountry) ||
          event.relatedHistoricalCountries?.some(
            (c) => c.id === selectedCountry,
          )

        return categoryOk && keywordOk && centuryOk && countryOk
      })
  }, [
    events,
    selectedCategory,
    normalizedKeyword,
    selectedCentury,
    selectedCountry,
  ])

  // ===== 이벤트 정렬 =====
  const sortedEvents = useMemo(() => {
    const eventsCopy = [...filteredEvents]

    const sorted = eventsCopy.sort((eventA, eventB) => {
      let comparison = 0

      switch (sortBy) {
        case 'recent':
          comparison =
            new Date(eventA.startDate).getTime() -
            new Date(eventB.startDate).getTime()
          break
        case 'duration':
          comparison =
            eventA.stats.durationInYears - eventB.stats.durationInYears
          break
        default:
          comparison =
            new Date(eventA.startDate).getTime() -
            new Date(eventB.startDate).getTime()
          break
      }

      return sortDirection === 'asc' ? comparison : -comparison
    })

    return sorted
  }, [filteredEvents, sortBy, sortDirection])

  // ===== 필터 칩 생성 =====
  /**
   * 칩 라벨 — 국가명 lookup은 reference data(countries / historicalCountries)에서
   * O(N_country)로 한 번. 이전엔 events 풀스캔(N_events × M_relatedCountries)이라
   * 사건이 늘면 비례해서 무거워졌고, useMemo도 안 걸려 매 렌더 반복됨.
   */
  const filterSummaryChips = useMemo<FilterChip[]>(() => {
    const chips: FilterChip[] = []

    if (selectedCategory !== FILTER_ALL) {
      const name =
        dbCategories.find((cat) => cat.id === selectedCategory)?.name ||
        '알 수 없음'
      chips.push({
        key: 'category',
        label: `카테고리 · ${name}`,
        onClear: () => setSelectedCategory(FILTER_ALL),
      })
    }

    if (selectedCountry !== FILTER_ALL) {
      const modern = countries.find((c) => c.id === selectedCountry)
      const historical = !modern
        ? historicalCountries.find((c) => c.id === selectedCountry)
        : undefined
      const name = modern?.name ?? historical?.name ?? '알 수 없음'
      chips.push({
        key: 'country',
        label: `국가 · ${name}`,
        onClear: () => setSelectedCountry(FILTER_ALL),
      })
    }

    if (selectedPositionType !== FILTER_ALL) {
      const label =
        MOCK_POSITION_TYPES.find((t) => t.value === selectedPositionType)
          ?.label || selectedPositionType
      chips.push({
        key: 'positionType',
        label: `직업 · ${label}`,
        onClear: () => setSelectedPositionType(FILTER_ALL),
      })
    }

    if (trimmedKeyword.length > 0) {
      chips.push({
        key: 'keyword',
        label: `검색어 · ${trimmedKeyword}`,
        onClear: () => setKeyword(''),
      })
    }

    return chips
  }, [
    selectedCategory,
    selectedCountry,
    selectedPositionType,
    trimmedKeyword,
    dbCategories,
    countries,
    historicalCountries,
  ])

  const hasActiveFilters = filterSummaryChips.length > 0

  // ===== 필터 초기화 =====
  const handleResetFilters = () => {
    setSelectedCategory(FILTER_ALL)
    setKeyword('')
    setSortBy('recent')
    setSortDirection('desc')
    setSelectedCentury(FILTER_ALL)
    setSelectedCountry(FILTER_ALL)
    setSelectedPositionType(FILTER_ALL)
  }

  return {
    // 상태
    selectedCategory,
    keyword,
    sortBy,
    sortDirection,
    selectedCentury,
    selectedCountry,
    selectedPositionType,
    showFlatView,

    // 세터
    setSelectedCategory,
    setKeyword,
    setSortBy,
    setSortDirection,
    setSelectedCentury,
    setSelectedCountry,
    setSelectedPositionType,
    setShowFlatView,

    // 계산된 값
    availableCountries,
    availableCenturies,
    filteredEvents,
    sortedEvents,
    filterSummaryChips,
    hasActiveFilters,

    // 액션
    handleResetFilters,
  }
}
