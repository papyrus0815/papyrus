import { act, renderHook } from '@testing-library/react'

import { FILTER_ALL } from '@/features/event-list/lib'

import type { HistoricalEvent } from '../../../pages/events/create/events.types'

import type { FilterReferenceState } from './reference-label'
import { useEventFilters, type EventFilterOptions } from './useEventFilters'

/**
 * 필터 의미론 단일 출처의 회귀 가드 (2026-08-02 검토 `GAP-10`, 배치 2).
 *
 * 이 훅은 `/events`의 "무엇이 조건을 만족하는가"를 혼자 정의하는데 spec이 **0건**이었고,
 * 이번 검토에서 발굴된 결함의 절반이 여기서 나왔다(세기 두 점 비교 `DATA-1`,
 * 국가 id 정확 일치 `DATA-4`, 북마크 사후 필터 `IA-7`, location 누락 `GAP-11`).
 * 술어 테이블·파생값·칩·리셋 범위를 여기에 고정해 두고 술어를 고친다.
 */

const event = (id: string, patch: Partial<HistoricalEvent> = {}): HistoricalEvent =>
  ({
    id,
    title: id,
    description: '',
    startDate: '2000-01-01',
    keywords: [],
    ...patch,
  }) as unknown as HistoricalEvent

interface RenderArgs {
  events?: HistoricalEvent[]
  categories?: Array<{ id: string; name: string }>
  countries?: Array<{ id: string; name: string; continentId?: string | null }>
  historicalCountries?: Array<{
    id: string
    name: string
    parentModernCountryIds?: string[]
  }>
  continents?: Array<{ id: string; name: string }>
  bookmarksOnly?: boolean
  anchorsOnly?: boolean
  scopeAnchorId?: string | null
  bookmarks?: Set<string>
  /** URL 시드(검토 URL-5) — 첫 렌더에만 적용된다 */
  initial?: EventFilterOptions['initial']
  /** 참조 데이터 로드 상태(검토 GAP-5) */
  referenceState?: FilterReferenceState
}

const renderFilters = (args: RenderArgs = {}) =>
  renderHook(
    (props: RenderArgs) =>
      useEventFilters(
        props.events ?? [],
        (props.categories ?? []) as never,
        (props.countries ?? []) as never,
        (props.historicalCountries ?? []) as never,
        (props.continents ?? []) as never,
        {
          bookmarksOnly: props.bookmarksOnly,
          anchorsOnly: props.anchorsOnly,
          scopeAnchorId: props.scopeAnchorId,
          bookmarks: props.bookmarks,
          initial: props.initial,
          referenceState: props.referenceState,
        },
      ),
    { initialProps: args },
  )

// ─────────────────────────────────────────────────────────────────────────────
// 세기 — 구간 겹침 (DATA-1 / IA-4)
// ─────────────────────────────────────────────────────────────────────────────

describe('useEventFilters — 세기 술어는 구간 겹침이다', () => {
  const spanning = event('spanning', {
    startDate: '0250-01-01', // 3세기
    endDate: '0650-01-01', // 7세기
  })

  it('시작·끝 사이 세기로도 찾힌다 (3~7세기 사건을 5세기로)', () => {
    const { result } = renderFilters({ events: [spanning] })

    act(() => result.current.setSelectedCentury(5))
    expect(result.current.matchesEvent(spanning)).toBe(true)
  })

  it('시작·끝 세기 자신도 포함한다', () => {
    const { result } = renderFilters({ events: [spanning] })

    act(() => result.current.setSelectedCentury(3))
    expect(result.current.matchesEvent(spanning)).toBe(true)
    act(() => result.current.setSelectedCentury(7))
    expect(result.current.matchesEvent(spanning)).toBe(true)
  })

  it('구간 밖 세기는 탈락한다', () => {
    const { result } = renderFilters({ events: [spanning] })

    act(() => result.current.setSelectedCentury(8))
    expect(result.current.matchesEvent(spanning)).toBe(false)
  })

  it('종료일이 없으면 시작 세기 하나만 만족한다', () => {
    const single = event('single', { startDate: '1850-06-01' })
    const { result } = renderFilters({ events: [single] })

    act(() => result.current.setSelectedCentury(19))
    expect(result.current.matchesEvent(single)).toBe(true)
    act(() => result.current.setSelectedCentury(20))
    expect(result.current.matchesEvent(single)).toBe(false)
  })

  it('BC는 음수 세기로 겹침 판정한다 (기원전 3~1세기 사건을 기원전 2세기로)', () => {
    const bc = event('bc', { startDate: '-0250-01-01', endDate: '-0050-01-01' })
    const { result } = renderFilters({ events: [bc] })

    act(() => result.current.setSelectedCentury(-2))
    expect(result.current.matchesEvent(bc)).toBe(true)
    act(() => result.current.setSelectedCentury(2))
    expect(result.current.matchesEvent(bc)).toBe(false)
  })

  it('BC→AD를 건너뛰는 사건은 양쪽 끝 세기 모두 만족한다', () => {
    const crossing = event('crossing', {
      startDate: '-0050-01-01',
      endDate: '0050-01-01',
    })
    const { result } = renderFilters({ events: [crossing] })

    act(() => result.current.setSelectedCentury(-1))
    expect(result.current.matchesEvent(crossing)).toBe(true)
    act(() => result.current.setSelectedCentury(1))
    expect(result.current.matchesEvent(crossing)).toBe(true)
  })

  it('0세기는 존재하지 않는다 — 기원전↔기원후 사건도 통과시키지 않는다', () => {
    const crossing = event('crossing', {
      startDate: '-0050-01-01',
      endDate: '0050-01-01',
    })
    const { result } = renderFilters({ events: [crossing] })

    act(() => result.current.setSelectedCentury(0))
    expect(result.current.matchesEvent(crossing)).toBe(false)
  })

  it('날짜를 해석할 수 없는 사건은 세기를 고르면 탈락한다', () => {
    const undated = event('undated', { startDate: '' })
    const { result } = renderFilters({ events: [undated] })

    expect(result.current.matchesEvent(undated)).toBe(true) // 필터 없음
    act(() => result.current.setSelectedCentury(20))
    expect(result.current.matchesEvent(undated)).toBe(false)
  })

  it("'연도 미상' sentinel은 날짜 미상만 남긴다 (IA-5)", () => {
    const undated = event('undated', { startDate: '' })
    const dated = event('dated', { startDate: '1950-01-01' })
    const { result } = renderFilters({ events: [undated, dated] })

    act(() => result.current.setSelectedCentury('unknown'))
    expect(result.current.matchesEvent(undated)).toBe(true)
    expect(result.current.matchesEvent(dated)).toBe(false)
    expect(result.current.hasNarrowingFilters).toBe(true)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// availableCenturies — 술어와 같은 판정을 공유해야 한다
// ─────────────────────────────────────────────────────────────────────────────

describe('useEventFilters — availableCenturies', () => {
  it('걸친 중간 세기까지 옵션으로 만든다 (술어와 같은 헬퍼)', () => {
    const { result } = renderFilters({
      events: [event('a', { startDate: '0250-01-01', endDate: '0650-01-01' })],
    })

    expect(result.current.availableCenturies).toEqual([3, 4, 5, 6, 7])
  })

  it('0세기는 존재하지 않으므로 절대 넣지 않는다', () => {
    const { result } = renderFilters({
      events: [event('a', { startDate: '-0150-01-01', endDate: '0150-01-01' })],
    })

    expect(result.current.availableCenturies).toEqual([-2, -1, 1, 2])
  })

  it('오름차순 정렬 + 중복 제거', () => {
    const { result } = renderFilters({
      events: [
        event('a', { startDate: '1990-01-01' }),
        event('b', { startDate: '1850-01-01' }),
        event('c', { startDate: '1995-01-01' }),
      ],
    })

    expect(result.current.availableCenturies).toEqual([19, 20])
  })

  it('날짜 미상 사건은 옵션을 만들지 않는다', () => {
    const { result } = renderFilters({
      events: [event('a', { startDate: '' })],
    })

    expect(result.current.availableCenturies).toEqual([])
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// 국가 — 브리지 합집합 (DATA-4 / IA-3)
// ─────────────────────────────────────────────────────────────────────────────

describe('useEventFilters — 국가 술어', () => {
  const COUNTRIES = [
    { id: 'kr', name: '대한민국', continentId: 'asia' },
    { id: 'fr', name: '프랑스', continentId: 'europe' },
  ]
  const HISTORICAL = [
    { id: 'joseon', name: '조선', parentModernCountryIds: ['kr'] },
    { id: 'gaul', name: '갈리아' },
  ]

  const taggedModern = event('modern', {
    relatedCountries: [{ id: 'kr', name: '대한민국' }],
  })
  const taggedHistorical = event('historical', {
    relatedHistoricalCountries: [{ id: 'joseon', name: '조선' }],
  })
  const unrelated = event('unrelated', {
    relatedCountries: [{ id: 'fr', name: '프랑스' }],
  })

  const render = () =>
    renderFilters({
      events: [taggedModern, taggedHistorical, unrelated],
      countries: COUNTRIES,
      historicalCountries: HISTORICAL,
    })

  it('현대 국가 id 정확 일치', () => {
    const { result } = render()
    act(() => result.current.setSelectedCountry('kr'))
    expect(result.current.matchesEvent(taggedModern)).toBe(true)
    expect(result.current.matchesEvent(unrelated)).toBe(false)
  })

  it('현대 국가를 고르면 브리지로 연결된 역사국가 태그도 합류한다', () => {
    const { result } = render()
    act(() => result.current.setSelectedCountry('kr'))
    expect(result.current.matchesEvent(taggedHistorical)).toBe(true)
  })

  it('역사국가 id는 자기 자신만 — 역방향 확장은 하지 않는다(서버 규약과 동일)', () => {
    const { result } = render()
    act(() => result.current.setSelectedCountry('joseon'))
    expect(result.current.matchesEvent(taggedHistorical)).toBe(true)
    expect(result.current.matchesEvent(taggedModern)).toBe(false)
  })

  it('브리지가 없는 현대 국가는 자기 태그만 본다', () => {
    const { result } = render()
    act(() => result.current.setSelectedCountry('fr'))
    expect(result.current.matchesEvent(unrelated)).toBe(true)
    expect(result.current.matchesEvent(taggedHistorical)).toBe(false)
  })
})

describe('useEventFilters — 대륙 술어', () => {
  const CONTINENTS = [{ id: 'asia', name: '아시아' }]
  const COUNTRIES = [{ id: 'kr', name: '대한민국', continentId: 'asia' }]

  it('country.continentId 조인으로 판정한다', () => {
    const asian = event('asian', {
      relatedCountries: [{ id: 'kr', name: '대한민국' }],
    })
    const { result } = renderFilters({
      events: [asian],
      countries: COUNTRIES,
      continents: CONTINENTS,
    })

    act(() => result.current.setSelectedContinent('asia'))
    expect(result.current.matchesEvent(asian)).toBe(true)
    act(() => result.current.setSelectedContinent('europe'))
    expect(result.current.matchesEvent(asian)).toBe(false)
  })

  it('역사국가로만 태그된 사건은 대륙 축에서 빠진다 (v1 규약 — 회귀 가드)', () => {
    const historicalOnly = event('h', {
      relatedHistoricalCountries: [{ id: 'joseon', name: '조선' }],
    })
    const { result } = renderFilters({
      events: [historicalOnly],
      countries: COUNTRIES,
      continents: CONTINENTS,
      historicalCountries: [
        { id: 'joseon', name: '조선', parentModernCountryIds: ['kr'] },
      ],
    })

    act(() => result.current.setSelectedContinent('asia'))
    expect(result.current.matchesEvent(historicalOnly)).toBe(false)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// 키워드 — 검색 대상 필드 (GAP-11 / DATA-16)
// ─────────────────────────────────────────────────────────────────────────────

describe('useEventFilters — 키워드 술어', () => {
  const target = event('target', {
    title: '베르됭 전투',
    description: '서부전선의 소모전',
    keywords: ['참호전'],
    location: '프랑스 뫼즈',
  })

  it.each([
    ['제목', '베르됭'],
    ['설명', '소모전'],
    ['키워드', '참호전'],
    ['장소(location)', '뫼즈'],
  ])('%s로 검색된다', (_label, query) => {
    const { result } = renderFilters({ events: [target] })
    act(() => result.current.setKeyword(query))
    expect(result.current.matchesEvent(target)).toBe(true)
  })

  it('대소문자를 구분하지 않는다', () => {
    const english = event('en', { title: 'Battle of Verdun' })
    const { result } = renderFilters({ events: [english] })
    act(() => result.current.setKeyword('VERDUN'))
    expect(result.current.matchesEvent(english)).toBe(true)
  })

  it('공백만 입력하면 아무것도 좁히지 않는다', () => {
    const { result } = renderFilters({ events: [target] })
    act(() => result.current.setKeyword('   '))
    expect(result.current.hasNarrowingFilters).toBe(false)
    expect(result.current.filterSummaryChips).toHaveLength(0)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// 북마크 — 다른 축과 같은 레인 (IA-7 / DATA-10)
// ─────────────────────────────────────────────────────────────────────────────

describe('useEventFilters — 북마크는 술어 레인에 합류한다', () => {
  const marked = event('marked')
  const plain = event('plain')

  it('bookmarksOnly면 북마크 안 된 사건은 술어에서 탈락한다', () => {
    const { result } = renderFilters({
      events: [marked, plain],
      bookmarksOnly: true,
      bookmarks: new Set(['marked']),
    })

    expect(result.current.matchesEvent(marked)).toBe(true)
    expect(result.current.matchesEvent(plain)).toBe(false)
    expect(result.current.hasNarrowingFilters).toBe(true)
  })

  it('bookmarksOnly가 꺼져 있으면 북마크 집합을 무시한다', () => {
    const { result } = renderFilters({
      events: [marked, plain],
      bookmarksOnly: false,
      bookmarks: new Set(['marked']),
    })

    expect(result.current.matchesEvent(plain)).toBe(true)
    expect(result.current.hasNarrowingFilters).toBe(false)
  })

  it('북마크한 자식을 가진 부모 루트는 결과에 남는다 (문맥 행 존치)', () => {
    const parent = event('parent')
    const child = event('child', { parentEventId: 'parent' })
    const { result } = renderFilters({
      events: [parent, child],
      bookmarksOnly: true,
      bookmarks: new Set(['child']),
    })

    expect(result.current.filteredEvents.map((item) => item.id)).toEqual([
      'parent',
    ])
    expect(result.current.matchesEvent(parent)).toBe(false)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// 루트 선별 — 자손 매칭이면 루트를 남긴다
// ─────────────────────────────────────────────────────────────────────────────

describe('useEventFilters — filteredEvents', () => {
  it('자식만 매칭돼도 그 루트를 남기고, 출력은 루트만이다', () => {
    const parent = event('parent', { title: '부모' })
    const child = event('child', { title: '자식', parentEventId: 'parent' })
    const { result } = renderFilters({ events: [parent, child] })

    act(() => result.current.setKeyword('자식'))
    expect(result.current.filteredEvents.map((item) => item.id)).toEqual([
      'parent',
    ])
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// 칩 — 라벨·onClear
// ─────────────────────────────────────────────────────────────────────────────

describe('useEventFilters — 활성 칩', () => {
  const setup = () =>
    renderFilters({
      events: [event('a')],
      categories: [{ id: 'cat-war', name: '전쟁' }],
      countries: [{ id: 'kr', name: '대한민국' }],
      historicalCountries: [
        { id: 'joseon', name: '조선', parentModernCountryIds: ['kr'] },
        { id: 'gaul', name: '갈리아' },
      ],
      continents: [{ id: 'asia', name: '아시아' }],
    })

  it('축마다 칩 하나 — 라벨은 필드명 · 값', () => {
    const { result } = setup()

    act(() => {
      result.current.setSelectedCategory('cat-war')
      result.current.setSelectedContinent('asia')
      result.current.setSelectedCentury(19)
      result.current.setKeyword('전투')
    })

    const labels = result.current.filterSummaryChips.map((chip) => chip.label)
    expect(labels).toContain('카테고리 · 전쟁')
    expect(labels).toContain('대륙 · 아시아')
    expect(labels).toContain('세기 · 19세기')
    expect(labels).toContain('검색어 · 전투')
  })

  it('브리지가 있는 현대 국가 칩은 확장 범위를 라벨에 밝힌다', () => {
    const { result } = setup()
    act(() => result.current.setSelectedCountry('kr'))

    expect(result.current.filterSummaryChips[0].label).toBe(
      '국가 · 대한민국(연결 역사국가 포함)',
    )
  })

  it('브리지가 없으면 확장 문구를 붙이지 않는다', () => {
    const { result } = setup()
    act(() => result.current.setSelectedCountry('gaul'))

    expect(result.current.filterSummaryChips[0].label).toBe('국가 · 갈리아')
  })

  it("'연도 미상' 세기 칩", () => {
    const { result } = setup()
    act(() => result.current.setSelectedCentury('unknown'))

    expect(result.current.filterSummaryChips[0].label).toBe('세기 · 연도 미상')
  })

  it('onClear는 그 축만 되돌린다', () => {
    const { result } = setup()
    act(() => {
      result.current.setSelectedCategory('cat-war')
      result.current.setSelectedCentury(19)
    })

    const categoryChip = result.current.filterSummaryChips.find(
      (chip) => chip.key === 'category',
    )!
    act(() => categoryChip.onClear())

    expect(result.current.selectedCategory).toBe(FILTER_ALL)
    expect(result.current.selectedCentury).toBe(19)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// 리셋 범위
// ─────────────────────────────────────────────────────────────────────────────

describe('useEventFilters — handleResetFilters 범위', () => {
  it('5축 + 검색어를 되돌린다', () => {
    const { result } = renderFilters({ events: [event('a')] })

    act(() => {
      result.current.setSelectedCategory('cat')
      result.current.setSelectedCountry('kr')
      result.current.setSelectedContinent('asia')
      result.current.setSelectedCentury(19)
      result.current.setKeyword('전투')
    })
    expect(result.current.hasNarrowingFilters).toBe(true)

    act(() => result.current.handleResetFilters())

    expect(result.current.selectedCategory).toBe(FILTER_ALL)
    expect(result.current.selectedCountry).toBe(FILTER_ALL)
    expect(result.current.selectedContinent).toBe(FILTER_ALL)
    expect(result.current.selectedCentury).toBe(FILTER_ALL)
    expect(result.current.keyword).toBe('')
    expect(result.current.hasNarrowingFilters).toBe(false)
    expect(result.current.filterSummaryChips).toHaveLength(0)
  })

  it("'표시 옵션'인 계층 토글은 건드리지 않는다", () => {
    const { result } = renderFilters({ events: [event('a')] })

    act(() => result.current.setShowFlatView(true))
    act(() => result.current.handleResetFilters())

    expect(result.current.showFlatView).toBe(true)
  })

  it("'표시 옵션'인 정렬도 건드리지 않는다 (검토 URL-7)", () => {
    // 같은 훅의 hasNarrowingFilters가 정렬을 '표시 옵션'이라 선언해 놓고
    // 초기화만 그 선언을 어겼다 — 필터를 풀려다 정렬까지 잃었다.
    const { result } = renderFilters({ events: [event('a')] })

    act(() => {
      result.current.setSortBy('duration')
      result.current.setSortDirection('asc')
      result.current.setSelectedCategory('cat')
    })
    act(() => result.current.handleResetFilters())

    expect(result.current.selectedCategory).toBe(FILTER_ALL)
    expect(result.current.sortBy).toBe('duration')
    expect(result.current.sortDirection).toBe('asc')
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// URL 시드 · 참조 라벨 (배치 4)
// ─────────────────────────────────────────────────────────────────────────────

describe('useEventFilters — URL 시드(검토 URL-5)', () => {
  it('initial이 첫 렌더부터 상태에 반영된다', () => {
    const { result } = renderFilters({
      events: [event('a')],
      initial: {
        selectedCategory: 'cat-1',
        selectedCountry: 'kr',
        selectedContinent: 'asia',
        selectedCentury: 19,
        keyword: '전투',
        sortBy: 'duration',
        sortDirection: 'asc',
        showFlatView: true,
      },
    })

    // 첫 커밋에서 이미 URL과 같다 — effect가 뒤늦게 채우던 구간이 없다.
    expect(result.current.selectedCategory).toBe('cat-1')
    expect(result.current.selectedCountry).toBe('kr')
    expect(result.current.selectedContinent).toBe('asia')
    expect(result.current.selectedCentury).toBe(19)
    expect(result.current.keyword).toBe('전투')
    expect(result.current.sortBy).toBe('duration')
    expect(result.current.sortDirection).toBe('asc')
    expect(result.current.showFlatView).toBe(true)
    expect(result.current.hasNarrowingFilters).toBe(true)
  })
})

describe('useEventFilters — 칩 폴백 라벨(검토 GAP-5)', () => {
  const labelOf = (
    chips: Array<{ key: string; label: string }>,
    key: string,
  ) => chips.find((chip) => chip.key === key)?.label

  it('참조 로딩 중에는 "불러오는 중"으로 구분한다', () => {
    const { result } = renderFilters({
      events: [event('a')],
      initial: { selectedCategory: 'cat-1', selectedContinent: 'asia' },
      referenceState: {
        category: 'loading',
        country: 'loading',
        continent: 'loading',
      },
    })

    expect(labelOf(result.current.filterSummaryChips, 'category')).toBe(
      '카테고리 · 불러오는 중',
    )
    expect(labelOf(result.current.filterSummaryChips, 'continent')).toBe(
      '대륙 · 불러오는 중',
    )
  })

  it('참조 조회 실패는 "이름 조회 실패"로 구분한다', () => {
    const { result } = renderFilters({
      events: [event('a')],
      initial: { selectedCountry: 'kr' },
      referenceState: {
        category: 'ready',
        country: 'error',
        continent: 'ready',
      },
    })

    expect(labelOf(result.current.filterSummaryChips, 'country')).toBe(
      '국가 · 이름 조회 실패',
    )
  })

  it('로드가 끝났는데 못 찾으면 "알 수 없음"이다', () => {
    const { result } = renderFilters({
      events: [event('a')],
      initial: { selectedCategory: 'deleted-cat' },
      categories: [{ id: 'cat-1', name: '정치' }],
    })

    expect(labelOf(result.current.filterSummaryChips, 'category')).toBe(
      '카테고리 · 알 수 없음',
    )
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// 앵커 축 — 파생 앵커 칩 + 스코프 모수 축소
// (docs/event-root-designation-review.md 배치0·배치3)
// ─────────────────────────────────────────────────────────────────────────────

/** 노드 트리를 얹은 사건 — 앵커 판정은 `hierarchy`의 자손 수를 본다. */
const anchorEvent = (
  id: string,
  childIds: string[] = [],
  parentEventId?: string,
): HistoricalEvent =>
  event(id, {
    parentEventId,
    hierarchy: {
      id,
      title: id,
      summary: '',
      period: { start: '2000-01-01' },
      importance: 'notable',
      children: childIds.map((childId) => ({
        id: childId,
        title: childId,
        summary: '',
        period: { start: '2000-01-01' },
        importance: 'notable',
        children: [],
      })),
    },
  } as unknown as Partial<HistoricalEvent>)

describe("useEventFilters — '최상위(앵커) 사건만' 축", () => {
  const ww1 = anchorEvent('ww1', ['sarajevo'])
  const sarajevo = anchorEvent('sarajevo', [], 'ww1')
  const solo = anchorEvent('kiel-canal')
  const events = [ww1, sarajevo, solo]

  it('기본값은 모든 루트를 낸다 (앵커 + 단독)', () => {
    const { result } = renderFilters({ events })
    expect(result.current.filteredEvents.map((item) => item.id)).toEqual([
      'ww1',
      'kiel-canal',
    ])
  })

  it('앵커만 켜면 자손 0인 단독 루트가 빠진다', () => {
    const { result } = renderFilters({ events, anchorsOnly: true })
    expect(result.current.filteredEvents.map((item) => item.id)).toEqual(['ww1'])
  })

  it('자식 사건은 앵커 축과 무관하게 루트 배열에 들어오지 않는다', () => {
    const { result } = renderFilters({ events, anchorsOnly: true })
    expect(
      result.current.filteredEvents.some((item) => item.id === 'sarajevo'),
    ).toBe(false)
  })
})

describe('useEventFilters — 앵커 스코프(?anchor=)는 모수를 좁힌다', () => {
  // 러불 동맹 > 프랑스의 대러시아 차관 > 1888년 차관  (실 DB의 비루트 앵커 축소 모형)
  const alliance = anchorEvent('alliance', ['loan'])
  const loan = anchorEvent('loan', ['loan-1888'], 'alliance')
  const loan1888 = anchorEvent('loan-1888', [], 'loan')
  const unrelated = anchorEvent('unrelated')
  const events = [alliance, loan, loan1888, unrelated]

  it('스코프 밖 사건은 모수에서 사라진다', () => {
    const { result } = renderFilters({ events, scopeAnchorId: 'alliance' })
    expect(result.current.filteredEvents.map((item) => item.id)).toEqual([
      'alliance',
    ])
  })

  it('⚠️ 비루트 앵커로 진입해도 화면이 비지 않는다 (검토 K4 — 종료 게이트)', () => {
    // `isTreeRoot`로 걸렀다면 loan은 parentEventId가 있어 0행이 된다.
    const { result } = renderFilters({ events, scopeAnchorId: 'loan' })
    expect(result.current.filteredEvents.map((item) => item.id)).toEqual([
      'loan',
    ])
  })

  it('스코프 안에서는 앵커만 칩이 모수를 더 줄이지 않는다', () => {
    // 모수가 이미 한 앵커의 계보라, 여기에 앵커 판정을 또 걸면 자손이 통째로 사라진다.
    const { result } = renderFilters({
      events,
      scopeAnchorId: 'loan',
      anchorsOnly: true,
    })
    expect(result.current.filteredEvents.map((item) => item.id)).toEqual([
      'loan',
    ])
  })

  it('존재하지 않는 anchor id는 0행 — 조용히 전역 모수로 되돌아가지 않는다', () => {
    const { result } = renderFilters({ events, scopeAnchorId: 'ghost' })
    expect(result.current.filteredEvents).toHaveLength(0)
  })
})
