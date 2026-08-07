/**
 * URL 파서 계약 — **무효값이 이 spec의 본체다**(검토 배치 4).
 *
 * 이 페이지의 필터 결함 다수가 "URL에서 읽은 값을 그대로 상태로 썼다"에서 나왔다.
 * 검증은 `parseCatalogSearchParams` 한 곳에만 있으므로, 여기서 고정하면 initializer와
 * URL→state effect 양쪽이 동시에 보호된다.
 */
import { CENTURY_UNKNOWN } from '@/entities/event/model/types'
import { FILTER_ALL, TIMELINE_LANE_MODES, VIEW_MODES } from '@/features/event-list/lib'

import {
  DEFAULT_PAGE_SIZE,
  parseCatalogSearchParams,
  parseCenturyParam,
  parseHiddenCategoriesParam,
  parseSortParam,
} from './parse-catalog-search-params'

const parse = (search: string) =>
  parseCatalogSearchParams(new URLSearchParams(search))

describe('parseCenturyParam', () => {
  it('정상 세기(양수·음수)는 숫자로 통과한다', () => {
    expect(parseCenturyParam('17')).toBe(17)
    expect(parseCenturyParam('-5')).toBe(-5)
    expect(parseCenturyParam('21')).toBe(21)
  })

  it("'unknown' sentinel은 연도 미상 축으로 보존된다", () => {
    expect(parseCenturyParam(CENTURY_UNKNOWN)).toBe(CENTURY_UNKNOWN)
  })

  it('0세기는 존재하지 않으므로 낙하한다', () => {
    // 예전엔 Number.isFinite(0)이 true라 상태가 됐고, 어떤 사건과도 매칭되지 않았다.
    expect(parseCenturyParam('0')).toBe(FILTER_ALL)
    expect(parseCenturyParam('-0')).toBe(FILTER_ALL)
  })

  it('공백만 있는 값이 0세기로 둔갑하지 않는다', () => {
    // `Number(' ')`는 0 — 무검증 시절의 가장 조용한 함정.
    expect(parseCenturyParam(' ')).toBe(FILTER_ALL)
    expect(parseCenturyParam('')).toBe(FILTER_ALL)
  })

  it('소수·지수·비숫자는 낙하한다', () => {
    expect(parseCenturyParam('5.5')).toBe(FILTER_ALL)
    expect(parseCenturyParam('1e2')).toBe(FILTER_ALL)
    expect(parseCenturyParam('abc')).toBe(FILTER_ALL)
    expect(parseCenturyParam('+5')).toBe(FILTER_ALL)
  })

  it('|c| > 21은 낙하한다', () => {
    expect(parseCenturyParam('22')).toBe(FILTER_ALL)
    expect(parseCenturyParam('-99')).toBe(FILTER_ALL)
    expect(parseCenturyParam('999999999999999999999')).toBe(FILTER_ALL)
  })
})

describe('parseSortParam', () => {
  it('화이트리스트 값만 통과한다', () => {
    expect(parseSortParam('duration')).toBe('duration')
    expect(parseSortParam('created')).toBe('created')
  })

  it('알 수 없는 값은 기본 정렬로 낙하한다', () => {
    // 예전엔 `as SortOption` 캐스팅이라 정렬 컨트롤이 빈 칸이 됐다.
    expect(parseSortParam('recentlyAdded')).toBe('recent')
    expect(parseSortParam('')).toBe('recent')
    expect(parseSortParam(null)).toBe('recent')
  })
})

describe('parseHiddenCategoriesParam', () => {
  it('콤마 목록을 집합으로 만들고 빈 토큰을 버린다', () => {
    expect(Array.from(parseHiddenCategoriesParam('전쟁, 정치,,'))).toEqual([
      '전쟁',
      '정치',
    ])
  })

  it('`hide=`만 있으면 빈 집합이다(빈 이름 숨김으로 둔갑 금지)', () => {
    expect(parseHiddenCategoriesParam('').size).toBe(0)
    expect(parseHiddenCategoriesParam(null).size).toBe(0)
  })
})

describe('parseCatalogSearchParams', () => {
  it('파라미터가 없으면 전부 기본값이다', () => {
    const state = parse('')
    expect(state.keyword).toBe('')
    expect(state.selectedEventId).toBeNull()
    expect(state.bookmarksOnly).toBe(false)
    expect(state.selectedCategory).toBe(FILTER_ALL)
    expect(state.selectedCountry).toBe(FILTER_ALL)
    expect(state.selectedContinent).toBe(FILTER_ALL)
    expect(state.selectedCentury).toBe(FILTER_ALL)
    expect(state.pageSize).toBe(DEFAULT_PAGE_SIZE)
    expect(state.sortBy).toBe('recent')
    expect(state.sortDirection).toBe('desc')
    expect(state.showFlatView).toBe(false)
    expect(state.viewExplicit).toBe(false)
    expect(state.timelineLane).toBe(TIMELINE_LANE_MODES.CATEGORY)
    expect(state.hiddenTimelineCategories.size).toBe(0)
  })

  it('정상 딥링크를 그대로 복원한다', () => {
    const state = parse(
      'q=%EC%A0%84%EC%9F%81&cat=cat-1&country=c-1&continent=asia&century=17&size=50&sort=duration&dir=asc&flat=1&view=list&lane=country&hide=%EC%A0%84%EC%9F%81&bookmarks=1&event=ev-1',
    )
    expect(state.keyword).toBe('전쟁')
    expect(state.selectedCategory).toBe('cat-1')
    expect(state.selectedCountry).toBe('c-1')
    expect(state.selectedContinent).toBe('asia')
    expect(state.selectedCentury).toBe(17)
    expect(state.pageSize).toBe(50)
    expect(state.sortBy).toBe('duration')
    expect(state.sortDirection).toBe('asc')
    expect(state.showFlatView).toBe(true)
    expect(state.viewMode).toBe(VIEW_MODES.LIST)
    expect(state.viewExplicit).toBe(true)
    expect(state.timelineLane).toBe(TIMELINE_LANE_MODES.COUNTRY)
    expect(Array.from(state.hiddenTimelineCategories)).toEqual(['전쟁'])
    expect(state.bookmarksOnly).toBe(true)
    expect(state.selectedEventId).toBe('ev-1')
  })

  it('공백만 있는 검색어는 빈 검색어와 같다(검토 URL-13)', () => {
    // 무엇도 좁히지 않는데 URL에는 남아 '필터가 걸린 것처럼' 보이던 상태.
    expect(parse('q=%20%20').keyword).toBe('')
    expect(parse('q=%20%EC%A0%84%EC%9F%81%20').keyword).toBe('전쟁')
  })

  it('빈 id 파라미터는 필터 없음으로 낙하한다', () => {
    // `?cat=`이 그대로 상태가 되면 어떤 사건도 매칭되지 않아 0건 화면이 된다.
    const state = parse('cat=&country=%20&continent=&event=')
    expect(state.selectedCategory).toBe(FILTER_ALL)
    expect(state.selectedCountry).toBe(FILTER_ALL)
    expect(state.selectedContinent).toBe(FILTER_ALL)
    expect(state.selectedEventId).toBeNull()
  })

  it('무효한 size·dir·lane·view는 기본값으로 낙하한다', () => {
    const state = parse('size=7&dir=sideways&lane=galaxy&view=hologram')
    expect(state.pageSize).toBe(DEFAULT_PAGE_SIZE)
    expect(state.sortDirection).toBe('desc')
    expect(state.timelineLane).toBe(TIMELINE_LANE_MODES.CATEGORY)
    expect(state.viewExplicit).toBe(false)
  })

  it('bookmarks는 정확히 "1"일 때만 켜진다', () => {
    expect(parse('bookmarks=1').bookmarksOnly).toBe(true)
    expect(parse('bookmarks=true').bookmarksOnly).toBe(false)
    expect(parse('bookmarks=0').bookmarksOnly).toBe(false)
  })
})
