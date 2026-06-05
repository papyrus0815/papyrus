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
import type { ContinentResponseDto } from '@/shared/api/continents'
import type { CountryResponseDto } from '@/shared/api/countries'
import type { EventCategoryDto } from '@/shared/api/event-categories'
import type { HistoricalCountryResponseDto } from '@/shared/api/historical-countries'

import type { HistoricalEvent } from '../../../pages/events/create/events.types'
import { MOCK_POSITION_TYPES } from '../../../entities/event/model/mock-government-positions'
import { getCenturyFromDate } from '../../../pages/events/utils/events.utils'

/**
 * countries / historicalCountries는 `filterSummaryChips`의 국가명 lookup에 사용.
 * 미전달 시 events에서 fallback으로 찾으나 비용이 N(events) — 가능하면 전달 권장.
 *
 * continents는 (1) 칩 라벨 lookup (2) 대륙 필터 시 country.id → continentId 조인용.
 * 역사적 국가는 continentId가 없어 v1에서는 대륙 필터 활성 시 제외된다.
 */
export const useEventFilters = (
  events: HistoricalEvent[],
  dbCategories: EventCategoryDto[],
  countries: CountryResponseDto[] = [],
  historicalCountries: HistoricalCountryResponseDto[] = [],
  continents: ContinentResponseDto[] = [],
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
  const [selectedContinent, setSelectedContinent] = useState<
    typeof FILTER_ALL | string
  >(FILTER_ALL)
  const [selectedPositionType, setSelectedPositionType] = useState<
    typeof FILTER_ALL | string
  >(FILTER_ALL)
  const [showFlatView, setShowFlatView] = useState(false)

  /**
   * country.id → continentId lookup. 대륙 필터를 cheap하게 적용하기 위해
   * countries 참조 데이터에서 한 번만 빌드. 미해결(대륙 없음/null) 국가는 키 부재.
   */
  const countryContinentMap = useMemo(() => {
    const m = new Map<string, string>()
    for (const c of countries) {
      if (c.continentId) m.set(c.id, c.continentId)
    }
    return m
  }, [countries])

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
    /** 단일 사건이 현재 필터를 모두 만족하는가 — 루트·자식 공통 술어. */
    const matches = (event: HistoricalEvent): boolean => {
      const categoryOk =
        selectedCategory === FILTER_ALL || event.category === selectedCategory
      const keywordOk =
        normalizedKeyword.length === 0 ||
        event.title.toLowerCase().includes(normalizedKeyword) ||
        event.description.toLowerCase().includes(normalizedKeyword) ||
        event.tags.some((tag) => tag.toLowerCase().includes(normalizedKeyword))
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
        event.relatedHistoricalCountries?.some((c) => c.id === selectedCountry)
      /**
       * 대륙 필터 — relatedCountries(현대)만 고려. 역사적 국가는 직접
       * continentId가 없어 v1에서는 제외(향후 HistoricalCountryModernCountry
       * 조인으로 보강 가능).
       */
      const continentOk =
        selectedContinent === FILTER_ALL ||
        (event.relatedCountries?.some(
          (c) => countryContinentMap.get(c.id) === selectedContinent,
        ) ??
          false)

      return Boolean(
        categoryOk && keywordOk && centuryOk && countryOk && continentOk,
      )
    }

    /**
     * 자식 사건도 검색·필터 대상에 포함 — 자식만 매칭돼도 그 *루트*를 결과에 남긴다.
     * (이전엔 부모만 평가해, 자식 제목으로 검색하면 그 사건이 통째로 사라졌다. 자식은
     *  루트 펼침으로 도달하므로 루트를 살리면 계층에서 자연히 노출됨.)
     * 출력은 여전히 루트만 — downstream(hierarchy/flatten)이 의존하는 계약을 유지.
     */
    const childrenByParent = new Map<string, HistoricalEvent[]>()
    for (const e of events) {
      if (!e.parentEventId) continue
      const arr = childrenByParent.get(e.parentEventId)
      if (arr) arr.push(e)
      else childrenByParent.set(e.parentEventId, [e])
    }
    const matchesSelfOrDescendant = (event: HistoricalEvent): boolean => {
      if (matches(event)) return true
      const kids = childrenByParent.get(event.id)
      return kids ? kids.some(matchesSelfOrDescendant) : false
    }

    return events
      .filter((event) => !event.parentEventId)
      .filter(matchesSelfOrDescendant)
  }, [
    events,
    selectedCategory,
    normalizedKeyword,
    selectedCentury,
    selectedCountry,
    selectedContinent,
    countryContinentMap,
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

    if (selectedContinent !== FILTER_ALL) {
      const name =
        continents.find((c) => c.id === selectedContinent)?.name ??
        '알 수 없음'
      chips.push({
        key: 'continent',
        label: `대륙 · ${name}`,
        onClear: () => setSelectedContinent(FILTER_ALL),
      })
    }

    if (selectedCentury !== FILTER_ALL) {
      chips.push({
        key: 'century',
        label: `세기 · ${selectedCentury}세기`,
        onClear: () => setSelectedCentury(FILTER_ALL),
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
    selectedContinent,
    selectedCentury,
    selectedPositionType,
    trimmedKeyword,
    dbCategories,
    countries,
    historicalCountries,
    continents,
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
    setSelectedContinent(FILTER_ALL)
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
    selectedContinent,
    selectedPositionType,
    showFlatView,

    // 세터
    setSelectedCategory,
    setKeyword,
    setSortBy,
    setSortDirection,
    setSelectedCentury,
    setSelectedCountry,
    setSelectedContinent,
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
