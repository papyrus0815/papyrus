import { FILTER_ALL } from '@/features/event-list/lib'

import {
  type FilterAxisContext,
  type FilterableEvent,
  matchesFilterAxis,
} from './axis-predicates'

const context = (
  periodRange: FilterAxisContext['periodRange'],
): FilterAxisContext => ({
  selectedCategory: FILTER_ALL,
  selectedCountry: FILTER_ALL,
  selectedContinent: FILTER_ALL,
  selectedCentury: FILTER_ALL,
  normalizedKeyword: '',
  bookmarkGate: null,
  countryContinentMap: new Map(),
  linkedHistoricalIdsByModernId: new Map(),
  searchHaystackById: new Map(),
  periodRange,
})

const event = (startDate: string | null, endDate?: string | null): FilterableEvent => ({
  id: `${startDate}-${endDate}`,
  startDate,
  endDate: endDate ?? null,
})

describe("기간 축('이 재위 동안의 사건')", () => {
  const wilhelm = context({ from: 1888, to: 1918 })

  it('구간이 겹치면 통과 — 재위 전에 시작해 재위 중까지 이어진 사건도', () => {
    expect(matchesFilterAxis(event('1890-03-20'), 'period', wilhelm)).toBe(true)
    expect(matchesFilterAxis(event('1872-01-01', '1890-01-01'), 'period', wilhelm)).toBe(true)
    expect(matchesFilterAxis(event('1918-11-11'), 'period', wilhelm)).toBe(true)
  })

  it('밖이거나 연도를 모르면 걸러진다', () => {
    expect(matchesFilterAxis(event('1870-07-19', '1871-05-10'), 'period', wilhelm)).toBe(false)
    expect(matchesFilterAxis(event('1919-06-28'), 'period', wilhelm)).toBe(false)
    expect(matchesFilterAxis(event(null), 'period', wilhelm)).toBe(false)
  })

  it('BC는 부호 연도로 비교하고, 축이 꺼져 있으면 전부 통과', () => {
    const augustus = context({ from: -27, to: 14 })
    expect(matchesFilterAxis(event('-0020-01-01'), 'period', augustus)).toBe(true)
    expect(matchesFilterAxis(event('-0044-03-15'), 'period', augustus)).toBe(false)
    expect(matchesFilterAxis(event(null), 'period', context(null))).toBe(true)
  })
})
