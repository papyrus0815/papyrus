/**
 * useEventsFilter Hook
 * 이벤트 필터링 및 정렬 로직
 */
import { useMemo } from 'react'

import type {
  HistoricalEvent,
  HistoricalEventCategory,
} from '../create/events.types'
import { getCenturyFromDate } from '../utils/events.utils'

export type SortOption = 'impact' | 'recent' | 'duration'
export type CenturyFilter = 'all' | number

export interface FilterState {
  selectedCategory: 'all' | HistoricalEventCategory
  keyword: string
  sortBy: SortOption
  sortDirection: 'asc' | 'desc'
  selectedCentury: CenturyFilter
  selectedCountry: 'all' | string
}

export function useEventsFilter(
  events: HistoricalEvent[],
  filterState: FilterState,
) {
  const {
    selectedCategory,
    keyword,
    sortBy,
    sortDirection,
    selectedCentury,
    selectedCountry,
  } = filterState

  // 사용 가능한 국가 목록
  const availableCountries = useMemo(() => {
    const countries = new Set<string>()
    events.forEach((event) => {
      event.countries.forEach((country) => countries.add(country.name))
    })
    return Array.from(countries).sort((a, b) => a.localeCompare(b, 'ko'))
  }, [events])

  // 사용 가능한 세기 목록
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

  // 카테고리별 개수
  const categoryCounts = useMemo(() => {
    return events.reduce<Record<HistoricalEventCategory, number>>(
      (acc, event) => {
        acc[event.category] = (acc[event.category] ?? 0) + 1
        return acc
      },
      {
        military: 0,
        political: 0,
        economic: 0,
        social: 0,
        technological: 0,
        cultural: 0,
        diplomatic: 0,
        conference: 0,
        religious: 0,
        other: 0,
      },
    )
  }, [events])

  // 필터링된 이벤트
  const filteredEvents = useMemo(() => {
    const normalizedKeyword = keyword.trim().toLowerCase()

    return events.filter((event) => {
      const categoryOk =
        selectedCategory === 'all' || event.category === selectedCategory

      const keywordOk =
        normalizedKeyword.length === 0 ||
        event.title.toLowerCase().includes(normalizedKeyword) ||
        event.description.toLowerCase().includes(normalizedKeyword) ||
        event.tags.some((tag) => tag.toLowerCase().includes(normalizedKeyword))

      const centuryOk = (() => {
        if (selectedCentury === 'all') return true
        const startCentury = getCenturyFromDate(event.startDate)
        const endCentury = getCenturyFromDate(event.endDate)
        return (
          startCentury === selectedCentury || endCentury === selectedCentury
        )
      })()

      const countryOk =
        selectedCountry === 'all' ||
        event.countries.some((country) => country.name === selectedCountry)

      return categoryOk && keywordOk && centuryOk && countryOk
    })
  }, [events, selectedCategory, keyword, selectedCentury, selectedCountry])

  // 정렬된 이벤트
  const sortedEvents = useMemo(() => {
    const eventsCopy = [...filteredEvents]

    return eventsCopy.sort((a, b) => {
      let comparison = 0

      switch (sortBy) {
        case 'recent':
          comparison =
            new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
          break
        case 'duration':
          comparison = a.stats.durationInYears - b.stats.durationInYears
          break
        case 'impact':
        default:
          comparison = a.stats.casualties.total - b.stats.casualties.total
          break
      }

      return sortDirection === 'asc' ? comparison : -comparison
    })
  }, [filteredEvents, sortBy, sortDirection])

  // 통계
  const stats = useMemo(() => {
    const totalCasualties = events.reduce(
      (acc, event) => acc + event.stats.casualties.total,
      0,
    )
    const totalNations = events.reduce(
      (acc, event) => acc + event.stats.participatingNations,
      0,
    )
    const avgDurationInYears =
      events.length === 0
        ? 0
        : Math.round(
            events.reduce(
              (acc, event) => acc + event.stats.durationInYears,
              0,
            ) / events.length,
          )
    const uniqueTagCount = new Set(events.flatMap((event) => event.tags)).size

    return {
      totalCasualties,
      totalNations,
      avgDurationInYears,
      uniqueTagCount,
    }
  }, [events])

  return {
    filteredEvents,
    sortedEvents,
    availableCountries,
    availableCenturies,
    categoryCounts,
    stats,
  }
}
