/**
 * 상태 → URL 쓰기 계약 중 **검색어 축**을 고정한다 (2026-08-02 검토 `PERF-11`, 배치 8).
 *
 * `q`의 소스를 raw 입력값에서 디바운스된 값으로 옮기면서 새 함정이 하나 생겼다:
 * 디바운스 대기 구간(입력 ≠ 적용)에 다른 축이 바뀌어 쓰기 effect가 먼저 돌면,
 * 아직 따라오지 못한 디바운스 값이 URL의 `q`를 지워 버릴 수 있다. 그래서 대기 중에는
 * `q`를 **건드리지 않는다**. 그 두 가지(키당 write 없음 / 대기 중 보존)를 여기서 잠근다.
 */
import { renderHook } from '@testing-library/react'

import {
  FILTER_ALL,
  TIMELINE_LANE_MODES,
  VIEW_MODES,
} from '@/features/event-list/lib'

import {
  DEFAULT_PAGE_SIZE,
  parseCatalogSearchParams,
} from '../lib/parse-catalog-search-params'

import { useCatalogUrlSync } from './use-catalog-url-sync'

type SyncArgs = Parameters<typeof useCatalogUrlSync>[0]

/** 모든 세터는 이 spec의 관심사가 아니다 — URL→state 방향은 파서 spec이 따로 잠근다 */
const noopSetter = () => undefined

const makeArgs = (
  search: string,
  setSearchParams: SyncArgs['setSearchParams'],
  overrides: Partial<SyncArgs> = {},
): SyncArgs => ({
  searchParams: new URLSearchParams(search),
  setSearchParams,
  keywordInput: '',
  debouncedKeyword: '',
  selectedEventId: null,
  bookmarksOnly: false,
  selectedCategory: FILTER_ALL,
  selectedCountry: FILTER_ALL,
  selectedContinent: FILTER_ALL,
  selectedCentury: FILTER_ALL,
  sortBy: 'recent',
  sortDirection: 'desc',
  showFlatView: false,
  viewMode: VIEW_MODES.LIST,
  viewExplicit: false,
  pageSize: DEFAULT_PAGE_SIZE,
  timelineLane: TIMELINE_LANE_MODES.CATEGORY,
  hiddenTimelineCategories: new Set<string>(),
  setKeywordInput: noopSetter,
  setSelectedEventId: noopSetter,
  setBookmarksOnly: noopSetter,
  setSelectedCategory: noopSetter,
  setSelectedCountry: noopSetter,
  setSelectedContinent: noopSetter,
  setSelectedCentury: noopSetter,
  setSortBy: noopSetter,
  setSortDirection: noopSetter,
  setShowFlatView: noopSetter,
  setViewMode: noopSetter,
  setViewExplicit: noopSetter,
  setPageSize: noopSetter,
  setTimelineLane: noopSetter,
  setHiddenTimelineCategories: noopSetter,
  ...overrides,
})

const renderSync = (search: string, overrides: Partial<SyncArgs> = {}) => {
  const setSearchParams = jest.fn()
  renderHook(() =>
    useCatalogUrlSync(
      makeArgs(
        search,
        setSearchParams as unknown as SyncArgs['setSearchParams'],
        overrides,
      ),
    ),
  )
  return setSearchParams
}

/** 마지막 write가 만든 쿼리 파라미터 */
const lastWritten = (setSearchParams: jest.Mock): URLSearchParams =>
  setSearchParams.mock.calls[setSearchParams.mock.calls.length - 1][0]

describe('useCatalogUrlSync — 검색어 축(검토 PERF-11)', () => {
  it('디바운스 대기 중(입력 ≠ 적용)에는 URL을 쓰지 않는다', () => {
    // 예전엔 raw 입력이 소스라 'a'·'ab'·'abc' 각각이 setSearchParams를 불렀다(키당 렌더 2회).
    const setSearchParams = renderSync('', {
      keywordInput: 'abc',
      debouncedKeyword: '',
    })
    expect(setSearchParams).not.toHaveBeenCalled()
  })

  it('디바운스가 끝나면 그때 q를 쓴다', () => {
    const setSearchParams = renderSync('', {
      keywordInput: 'abc',
      debouncedKeyword: 'abc',
    })
    expect(setSearchParams).toHaveBeenCalledTimes(1)
    expect(lastWritten(setSearchParams).get('q')).toBe('abc')
  })

  it('대기 중에 다른 축이 바뀌어도 URL의 q는 지워지지 않는다', () => {
    // 딥링크로 들어와 입력창은 이미 'foo'인데 디바운스 값은 아직 따라오지 못한 250ms 창.
    // 이때 북마크 토글이 쓰기 effect를 먼저 깨우면, 순진한 구현은 q를 지운다.
    const setSearchParams = renderSync('q=foo', {
      keywordInput: 'foo',
      debouncedKeyword: '',
      bookmarksOnly: true,
    })
    const written = lastWritten(setSearchParams)
    expect(written.get('q')).toBe('foo')
    expect(written.get('bookmarks')).toBe('1')
  })

  it('공백만 남은 검색어는 적용 시점에 URL에서 빠진다(URL-13 유지)', () => {
    const setSearchParams = renderSync('q=foo', {
      keywordInput: '   ',
      debouncedKeyword: '   ',
    })
    expect(lastWritten(setSearchParams).has('q')).toBe(false)
  })

  it('setSearchParams는 히스토리를 부풀리지 않도록 replace로 부른다', () => {
    const setSearchParams = renderSync('', {
      keywordInput: 'abc',
      debouncedKeyword: 'abc',
    })
    expect(setSearchParams.mock.calls[0][1]).toEqual({ replace: true })
  })
})

/**
 * 마운트 첫 커밋의 왕복 계약(검토 URL-5 · 검증 B).
 *
 * 파서 시딩의 **유일한 목적**은 "첫 커밋부터 state === URL"이다. 그게 깨지면
 * 상태→URL effect의 첫 write가 딥링크 필터를 지웠다 복구하고(뒤로가기 히스토리에
 * 그 중간 상태가 남는다), 무효값 정리도 '한 번의 write'라는 계약을 잃는다.
 * 그래서 파서 출력을 그대로 훅 인자로 넣어 **write가 일어나는지 자체**를 잠근다.
 */
describe('useCatalogUrlSync — 마운트 왕복(검토 URL-5)', () => {
  /** 페이지가 하는 시딩을 그대로 재현 — 파서 출력 → 훅 인자 */
  const seedFromUrl = (search: string): Partial<SyncArgs> => {
    const seed = parseCatalogSearchParams(new URLSearchParams(search))
    return {
      keywordInput: seed.keyword,
      // 마운트 시 useDebouncedValue는 초기값을 그대로 갖는다(대기 구간 없음).
      debouncedKeyword: seed.keyword,
      selectedEventId: seed.selectedEventId,
      bookmarksOnly: seed.bookmarksOnly,
      selectedCategory: seed.selectedCategory,
      selectedCountry: seed.selectedCountry,
      selectedContinent: seed.selectedContinent,
      selectedCentury: seed.selectedCentury,
      sortBy: seed.sortBy,
      sortDirection: seed.sortDirection,
      showFlatView: seed.showFlatView,
      viewMode: seed.viewMode,
      viewExplicit: seed.viewExplicit,
      pageSize: seed.pageSize,
      timelineLane: seed.timelineLane,
      hiddenTimelineCategories: seed.hiddenTimelineCategories,
    }
  }

  it('완전한 딥링크는 첫 커밋에서 URL을 한 번도 쓰지 않는다', () => {
    const search =
      'q=foo&event=e1&bookmarks=1&cat=c1&country=k1&continent=eu&century=17' +
      '&size=50&sort=duration&dir=asc&flat=1&view=grid&lane=country&hide=%EC%A0%84%EC%9F%81'
    const setSearchParams = renderSync(search, seedFromUrl(search))
    expect(setSearchParams).not.toHaveBeenCalled()
  })

  it('무효값은 첫 write 한 번으로 URL에서 사라지고 정상 축은 그대로 남는다', () => {
    // century=0(존재하지 않는 세기) · sort=bogus(화이트리스트 밖) — 파서가 기본값으로
    // 낙하시키고 setOrDel이 기본값 키를 지우므로, 별도 정리 코드 없이 한 번에 정리된다.
    const search = 'century=0&sort=bogus&cat=c1&view=list'
    const setSearchParams = renderSync(search, seedFromUrl(search))
    expect(setSearchParams).toHaveBeenCalledTimes(1)
    const written = lastWritten(setSearchParams)
    expect(written.has('century')).toBe(false)
    expect(written.has('sort')).toBe(false)
    expect(written.get('cat')).toBe('c1')
    // 명시된 view는 사용자 선택이므로 남는다(URL-12).
    expect(written.get('view')).toBe('list')
  })

  it('view가 없는 진입에서는 디바이스 추론 기본값을 URL에 싣지 않는다', () => {
    // 모바일 LIST 폴백이 링크로 새어 나가 받는 쪽 판단을 덮어쓰던 문제(URL-12).
    const setSearchParams = renderSync('cat=c1', seedFromUrl('cat=c1'))
    expect(setSearchParams).not.toHaveBeenCalled()
  })
})
