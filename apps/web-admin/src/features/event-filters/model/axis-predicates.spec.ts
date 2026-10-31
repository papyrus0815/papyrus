import { FILTER_ALL } from '@/features/event-list/lib'

import {
  type FilterAxisContext,
  type FilterableEvent,
  matchesFilterAxis,
  SUBTYPE_NONE,
  subtypeFilterLabel,
} from './axis-predicates'

const context = (
  periodRange: FilterAxisContext['periodRange'],
  selectedSubtype: FilterAxisContext['selectedSubtype'] = FILTER_ALL,
): FilterAxisContext => ({
  selectedCategory: FILTER_ALL,
  selectedSubtype,
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

describe('세부 분야 축 — 분야와 독립', () => {
  const law: FilterableEvent = { id: 'law', domain: 'MILITARY', type: 'LAW_POLICY' }
  const railLoan: FilterableEvent = { id: 'loan', domain: 'ECONOMY', type: 'TREATY' }
  const bare: FilterableEvent = { id: 'bare', domain: 'OTHER', type: null }

  it('세부 키가 같으면 통과 — 분야는 묻지 않는다(경제 › 조약도 조약 필터에 걸린다)', () => {
    expect(matchesFilterAxis(railLoan, 'subtype', context(null, 'TREATY'))).toBe(true)
    expect(matchesFilterAxis(law, 'subtype', context(null, 'TREATY'))).toBe(false)
  })

  it("'세부 없음'은 세부를 안 고른 사건만, 축이 꺼져 있으면 전부", () => {
    expect(matchesFilterAxis(bare, 'subtype', context(null, SUBTYPE_NONE))).toBe(true)
    expect(matchesFilterAxis(law, 'subtype', context(null, SUBTYPE_NONE))).toBe(false)
    expect(matchesFilterAxis(law, 'subtype', context(null))).toBe(true)
  })

  it('표시 이름 — 칩·트리거가 같은 문자열을 쓴다', () => {
    expect(subtypeFilterLabel('LAW_POLICY')).toBe('법령·정책·개혁')
    expect(subtypeFilterLabel(SUBTYPE_NONE)).toBe('세부 없음')
  })
})

describe('대륙 축 — 역사 국가도 브리지 현대 국가를 통해 매칭', () => {
  const joseonEvent: FilterableEvent = {
    id: 'joseon-war',
    relatedHistoricalCountries: [{ id: 'joseon' }],
  }

  it('역사 국가만 태그된 사건도 연결된 현대 국가의 대륙으로 매칭된다', () => {
    const asiaCtx: FilterAxisContext = {
      ...context(null),
      selectedContinent: 'asia',
      countryContinentMap: new Map([['kr', 'asia']]),
      linkedHistoricalIdsByModernId: new Map([['kr', new Set(['joseon'])]]),
    }
    const europeCtx: FilterAxisContext = {
      ...asiaCtx,
      selectedContinent: 'europe',
    }
    expect(matchesFilterAxis(joseonEvent, 'continent', asiaCtx)).toBe(true)
    expect(matchesFilterAxis(joseonEvent, 'continent', europeCtx)).toBe(false)
  })
})
