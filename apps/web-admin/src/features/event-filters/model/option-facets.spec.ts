/**
 * 옵션 건수·drop-one-out 회귀 가드(검토 배치 7 — IA-13 · IA-12 · IA-2).
 *
 * 여기서 못박는 계약은 셋이다:
 *  1) 건수는 **그 축만 뺀** 게이트로 센다 — "이걸 고르면 몇 건"이 정확해야 한다.
 *  2) 국가 건수에 **브리지 합류**가 반영된다 — 술어와 같은 정의(검토 DATA-4/IA-3).
 *  3) `dropOneOut`은 "이 축을 풀면 몇 건" — 빈 상태가 범인을 지목하는 근거다.
 */
import { CENTURY_UNKNOWN } from '@/entities/event/model/types'
import { FILTER_ALL } from '@/features/event-list/lib'

import {
  buildKeywordHaystack,
  type FilterableEvent,
  type FilterAxisContext,
} from './axis-predicates'
import { buildFilterOptionCounts } from './option-facets'

const EVENTS: FilterableEvent[] = [
  {
    id: 'e1',
    title: '병자호란',
    description: '',
    categoryId: 'war',
    startDate: '1636-12-01',
    relatedHistoricalCountries: [{ id: 'joseon' }],
  },
  {
    id: 'e2',
    title: '한일 국교 정상화',
    description: '',
    categoryId: 'treaty',
    startDate: '1965-06-22',
    relatedCountries: [{ id: 'kr' }, { id: 'jp' }],
  },
  {
    id: 'e3',
    title: '연도 미상 사건',
    description: '',
    categoryId: 'war',
    startDate: '',
    relatedCountries: [{ id: 'jp' }],
  },
]

/** '대한민국 → 조선' 브리지 한 줄 — 서버 `GET /events`가 쓰는 것과 같은 관계 */
const LINKED = new Map<string, ReadonlySet<string>>([
  ['kr', new Set(['joseon'])],
])

function makeContext(
  overrides: Partial<FilterAxisContext> = {},
): FilterAxisContext {
  return {
    selectedCategory: FILTER_ALL,
    selectedCountry: FILTER_ALL,
    selectedContinent: FILTER_ALL,
    selectedCentury: FILTER_ALL,
    normalizedKeyword: '',
    bookmarkGate: null,
    countryContinentMap: new Map([
      ['kr', 'asia'],
      ['jp', 'asia'],
    ]),
    linkedHistoricalIdsByModernId: LINKED,
    searchHaystackById: new Map(
      EVENTS.map((event) => [event.id, buildKeywordHaystack(event)]),
    ),
    ...overrides,
  }
}

describe('buildFilterOptionCounts', () => {
  it('축별 건수를 로드된 사건에서 센다 (IA-13)', () => {
    const counts = buildFilterOptionCounts(EVENTS, makeContext())

    expect(counts.unfiltered).toBe(3)
    expect(counts.category.get('war')).toBe(2)
    expect(counts.category.get('treaty')).toBe(1)
    expect(counts.continent.get('asia')).toBe(2)
    expect(counts.century.get(17)).toBe(1)
    expect(counts.century.get(20)).toBe(1)
    expect(counts.centuryUnknown).toBe(1)
  })

  it('국가 건수에 브리지 합류가 반영된다 (DATA-4/IA-3와 같은 정의)', () => {
    const counts = buildFilterOptionCounts(EVENTS, makeContext())

    // '조선'으로 태그된 e1은 브리지로 '대한민국'의 건수도 올린다.
    expect(counts.country.get('joseon')).toBe(1)
    expect(counts.country.get('kr')).toBe(2) // e1(브리지) + e2(직접)
    expect(counts.country.get('jp')).toBe(2)
  })

  it("건수는 '그 축만 뺀' 게이트로 센다 — 다른 축은 그대로 적용된다", () => {
    // 카테고리를 '조약'으로 좁힌 상태에서 국가 옵션의 건수를 물으면,
    // 그 조합에서 실제로 나올 결과 수여야 한다(e2 하나뿐).
    const counts = buildFilterOptionCounts(
      EVENTS,
      makeContext({ selectedCategory: 'treaty' }),
    )
    expect(counts.country.get('kr')).toBe(1)
    expect(counts.country.get('joseon')).toBeUndefined()
    // 반대로 카테고리 축 자신은 자기를 뺀 게이트라 전 축 값이 그대로 보인다.
    expect(counts.category.get('war')).toBe(2)
  })

  it('dropOneOut은 그 축을 풀었을 때의 건수다 (IA-12)', () => {
    const counts = buildFilterOptionCounts(
      EVENTS,
      makeContext({
        selectedCategory: 'treaty',
        selectedCentury: CENTURY_UNKNOWN,
      }),
    )

    // 지금 조건(조약 + 연도 미상)은 0건이다.
    expect(counts.dropOneOut.keyword).toBe(0)
    // 카테고리를 풀면 '연도 미상' e3 하나가 남는다.
    expect(counts.dropOneOut.category).toBe(1)
    // 세기를 풀면 '조약' e2 하나가 남는다.
    expect(counts.dropOneOut.century).toBe(1)
  })

  it('북마크도 다른 축과 같은 축이다', () => {
    const counts = buildFilterOptionCounts(
      EVENTS,
      makeContext({ bookmarkGate: new Set(['e2']) }),
    )
    expect(counts.dropOneOut.bookmark).toBe(3)
    expect(counts.category.get('war')).toBeUndefined()
    expect(counts.category.get('treaty')).toBe(1)
  })
})
