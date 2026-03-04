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
import type { EventCategoryDto } from '@/shared/api/event-categories'

import type { HistoricalEvent } from '../../../pages/events/create/events.types'
import { MOCK_POSITION_TYPES } from '../../../pages/events/list/mock-government-positions'
import { getCenturyFromDate } from '../../../pages/events/utils/events.utils'

export const useEventFilters = (
  events: HistoricalEvent[],
  dbCategories: EventCategoryDto[],
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
  /** 교황 등 전역 수반 표시 (모든 국가에서 다 뜨는 직책). true=표시, false=숨김 */
  const [showGlobalHeadsOfState, setShowGlobalHeadsOfState] = useState(true)

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
          (event as any).relatedCountries?.some(
            (country: any) => country.id === selectedCountry,
          ) ||
          (event as any).relatedHistoricalCountries?.some(
            (country: any) => country.id === selectedCountry,
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
  const filterSummaryChips: FilterChip[] = [
    selectedCategory !== FILTER_ALL && {
      key: 'category',
      label: `카테고리 · ${
        dbCategories.find((cat) => cat.id === selectedCategory)?.name ||
        '알 수 없음'
      }`,
      onClear: () => setSelectedCategory(FILTER_ALL),
    },
    selectedCountry !== FILTER_ALL && {
      key: 'country',
      label: `국가 · ${(() => {
        // events에서 해당 국가 정보 찾기
        for (const event of events) {
          const country = (event as any).relatedCountries?.find(
            (c: any) => c.id === selectedCountry,
          )
          if (country) return country.name

          const historicalCountry = (
            event as any
          ).relatedHistoricalCountries?.find(
            (c: any) => c.id === selectedCountry,
          )
          if (historicalCountry) return historicalCountry.name
        }
        return '알 수 없음'
      })()}`,
      onClear: () => setSelectedCountry(FILTER_ALL),
    },
    selectedPositionType !== FILTER_ALL && {
      key: 'positionType',
      label: `직업 · ${
        MOCK_POSITION_TYPES.find((type) => type.value === selectedPositionType)
          ?.label || selectedPositionType
      }`,
      onClear: () => setSelectedPositionType(FILTER_ALL),
    },
    trimmedKeyword.length > 0 && {
      key: 'keyword',
      label: `검색어 · ${trimmedKeyword}`,
      onClear: () => setKeyword(''),
    },
  ].filter((chip): chip is FilterChip => Boolean(chip))

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
    setShowGlobalHeadsOfState(true)
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
    showGlobalHeadsOfState,

    // 세터
    setSelectedCategory,
    setKeyword,
    setSortBy,
    setSortDirection,
    setSelectedCentury,
    setSelectedCountry,
    setSelectedPositionType,
    setShowFlatView,
    setShowGlobalHeadsOfState,

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
