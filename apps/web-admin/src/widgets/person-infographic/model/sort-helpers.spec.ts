/**
 * 인물 정렬 로직 테스트.
 * - makeSortFnWithPinned: 연도 방향 통일(출생·사망 모두 최신순)·미상 항상 뒤·동점 결정성·핀 우선
 * - compareCenturyMeta: 세기 그룹 최신/오래된순 방향 + '연도 미상' 항상 끝
 */
import { centuryOf, compareCenturyMeta, type CenturyMeta } from './century'
import { makeSortFnWithPinned } from './sort-helpers'
import type { AdaptedPerson } from './types'

const ERA_STUB: AdaptedPerson['era'] = {
  key: 'modern20',
  lbl: '현대 20c',
  from: 1900,
  to: 2000,
  color: '#000000',
}

function person(overrides: Partial<AdaptedPerson> & { id: string }): AdaptedPerson {
  return {
    name: overrides.name ?? overrides.id,
    born: null,
    died: null,
    activityYear: 0,
    era: ERA_STUB,
    age: null,
    region: '유럽',
    country: '미상',
    field: '기타',
    faction: '',
    influence: 0,
    profileImageUrl: null,
    isMonarch: false,
    isHeadOfState: false,
    primaryTitle: null,
    biography: null,
    isAlive: false,
    searchText: '',
    ...overrides,
  }
}

const NO_PIN = new Set<string>()

/** 정렬 후 id 순서만 추출 (가독성). */
function sortedIds(
  people: AdaptedPerson[],
  sortFn: (personA: AdaptedPerson, personB: AdaptedPerson) => number,
) {
  return people
    .slice()
    .sort(sortFn)
    .map((entry) => entry.id)
}

describe('makeSortFnWithPinned — 연도 방향', () => {
  it("출생연도(year)는 최신순 — 늦게 태어난 사람 먼저", () => {
    const people = [
      person({ id: 'old', born: 1800 }),
      person({ id: 'new', born: 1950 }),
      person({ id: 'mid', born: 1900 }),
    ]
    expect(sortedIds(people, makeSortFnWithPinned(NO_PIN, 'year'))).toEqual([
      'new',
      'mid',
      'old',
    ])
  })

  it('사망연도(deathYear)도 최신순 — 늦게 죽은 사람 먼저 (출생과 방향 일치)', () => {
    const people = [
      person({ id: 'early', died: 1850 }),
      person({ id: 'late', died: 1990 }),
    ]
    expect(sortedIds(people, makeSortFnWithPinned(NO_PIN, 'deathYear'))).toEqual([
      'late',
      'early',
    ])
  })

  it('출생연도 미상(null)은 방향과 무관하게 항상 뒤', () => {
    const people = [
      person({ id: 'unknown', born: null }),
      person({ id: 'known', born: 1500 }),
    ]
    expect(sortedIds(people, makeSortFnWithPinned(NO_PIN, 'year'))).toEqual([
      'known',
      'unknown',
    ])
  })

  it('BC(음수 연도)는 AD보다 오래됨 → 최신순에서 뒤', () => {
    const people = [
      person({ id: 'bc', born: -50 }),
      person({ id: 'ad', born: 100 }),
    ]
    expect(sortedIds(people, makeSortFnWithPinned(NO_PIN, 'year'))).toEqual([
      'ad',
      'bc',
    ])
  })
})

describe('makeSortFnWithPinned — 영향력·이름', () => {
  it('영향력(influence)은 내림차순', () => {
    const people = [
      person({ id: 'low', influence: 10 }),
      person({ id: 'high', influence: 90 }),
      person({ id: 'mid', influence: 50 }),
    ]
    expect(sortedIds(people, makeSortFnWithPinned(NO_PIN, 'influence'))).toEqual([
      'high',
      'mid',
      'low',
    ])
  })

  it('이름(name)은 오름차순(ko)', () => {
    const people = [
      person({ id: 'c', name: '다' }),
      person({ id: 'a', name: '가' }),
      person({ id: 'b', name: '나' }),
    ]
    expect(sortedIds(people, makeSortFnWithPinned(NO_PIN, 'name'))).toEqual([
      'a',
      'b',
      'c',
    ])
  })
})

describe('makeSortFnWithPinned — 동점 결정성', () => {
  it('영향력 동점이면 이름 오름차순으로 tiebreak', () => {
    const people = [
      person({ id: 'z', name: '하', influence: 50 }),
      person({ id: 'x', name: '가', influence: 50 }),
    ]
    expect(sortedIds(people, makeSortFnWithPinned(NO_PIN, 'influence'))).toEqual([
      'x',
      'z',
    ])
  })

  it('영향력·이름 모두 같으면 id로 tiebreak (안정적)', () => {
    const people = [
      person({ id: 'id-b', name: '동명', influence: 50 }),
      person({ id: 'id-a', name: '동명', influence: 50 }),
    ]
    const sortFn = makeSortFnWithPinned(NO_PIN, 'influence')
    // 입력 순서를 뒤집어도 결과가 동일 — 결정적 순서.
    expect(sortedIds(people, sortFn)).toEqual(['id-a', 'id-b'])
    expect(sortedIds(people.slice().reverse(), sortFn)).toEqual(['id-a', 'id-b'])
  })
})

describe('makeSortFnWithPinned — 핀 우선', () => {
  it('핀 된 인물은 정렬 기준과 무관하게 앞으로', () => {
    const people = [
      person({ id: 'a', influence: 90 }),
      person({ id: 'b', influence: 10 }),
    ]
    // 영향력상 a가 먼저지만 b를 핀하면 b가 앞으로.
    const sortFn = makeSortFnWithPinned(new Set(['b']), 'influence')
    expect(sortedIds(people, sortFn)).toEqual(['b', 'a'])
  })
})

const UNKNOWN_CENTURY: CenturyMeta = {
  key: 'unknown',
  label: '연도 미상',
  from: 0,
  to: 0,
  sortKey: Number.POSITIVE_INFINITY,
}

describe('compareCenturyMeta — 세기 그룹 방향', () => {
  const ad18 = centuryOf(1750) // 18세기
  const ad20 = centuryOf(1950) // 20세기
  const bc1 = centuryOf(-50) // 기원전 1세기

  it("desc(기본)는 최신 세기 먼저", () => {
    const sorted = [ad18, bc1, ad20]
      .slice()
      .sort((metaA, metaB) => compareCenturyMeta(metaA, metaB, 'desc'))
      .map((meta) => meta.key)
    expect(sorted).toEqual([ad20.key, ad18.key, bc1.key])
  })

  it('asc는 오래된 세기 먼저', () => {
    const sorted = [ad18, bc1, ad20]
      .slice()
      .sort((metaA, metaB) => compareCenturyMeta(metaA, metaB, 'asc'))
      .map((meta) => meta.key)
    expect(sorted).toEqual([bc1.key, ad18.key, ad20.key])
  })

  it("'연도 미상'은 desc/asc 모두 항상 맨 끝", () => {
    const descSorted = [UNKNOWN_CENTURY, ad20, bc1]
      .slice()
      .sort((metaA, metaB) => compareCenturyMeta(metaA, metaB, 'desc'))
      .map((meta) => meta.key)
    expect(descSorted[descSorted.length - 1]).toBe('unknown')

    const ascSorted = [UNKNOWN_CENTURY, ad20, bc1]
      .slice()
      .sort((metaA, metaB) => compareCenturyMeta(metaA, metaB, 'asc'))
      .map((meta) => meta.key)
    expect(ascSorted[ascSorted.length - 1]).toBe('unknown')
  })
})
