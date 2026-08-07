/**
 * URL ↔ 상태 양방향 동기화 (events catalog)
 *
 * - URL → 상태: 뒤로가기·외부 딥링크로 검색 파라미터가 바뀌면 끌어와 반영
 * - 상태 → URL: 사용자가 필터/검색/뷰를 조정하면 URL을 갱신 (replace로 히스토리 부풀림 방지)
 *
 * ## 파싱은 이 파일에 없다 (검토 배치 4)
 *
 * URL을 읽는 규칙은 전부 `../lib/parse-catalog-search-params`에 있다. 예전엔 이 훅과
 * `events.page`의 `useState` initializer가 **각자** URL을 읽었고, 검증 범위도 서로 달랐다.
 * 이제 두 경로가 같은 순수 함수를 쓰므로
 *  ⑴ 마운트 첫 커밋부터 `state === URL`이라 아래 '상태 → URL' effect의 첫 write가
 *     딥링크 필터를 지웠다 복구하는 구간이 없고(URL-5),
 *  ⑵ 무효값 검증(`century` 정수·비0·|c|≤21 / `sort` 화이트리스트 / `q` trim)이 한 곳에 모인다.
 *
 * 무효한 값이 URL에서 제거되는 것도 구조적으로 보장된다 — 파서가 기본값으로 낙하시키고,
 * 아래 effect의 `setOrDel`이 '기본값이면 키 삭제'이므로 첫 write에서 함께 정리된다.
 */
import { useEffect, useRef } from 'react'
import type { useSearchParams } from 'react-router-dom'

import type { CenturyFilter } from '@/entities/event/model'
import {
  FILTER_ALL,
  TIMELINE_LANE_MODES,
  type TimelineLaneMode,
  type ViewMode,
} from '@/features/event-list/lib'
import type { SortOption } from '@/features/event-list/lib/constants'

import {
  DEFAULT_PAGE_SIZE,
  DEFAULT_SORT,
  DEFAULT_SORT_DIRECTION,
  parseCatalogSearchParams,
} from '../lib/parse-catalog-search-params'

interface CatalogUrlSyncArgs {
  searchParams: URLSearchParams
  setSearchParams: ReturnType<typeof useSearchParams>[1]

  // 상태 (URL ← state)
  /** 입력창의 **날것** 값 — URL→state 비교와 '디바운스 대기 중' 판정에만 쓴다 */
  keywordInput: string
  /**
   * 250ms 디바운스를 통과한 검색어 — **URL에 실리는 값**(검토 PERF-11).
   *
   * 예전엔 URL 쓰기가 `keywordInput`에 걸려 있어 키 입력 한 번마다 `setSearchParams`가
   * 돌았다(= 키당 렌더 2회). 디바운스는 재계산만 늦추고 리렌더는 못 막고 있었다.
   * 부수적으로 계약도 정직해진다 — `q`는 이제 **실제로 적용된 검색어**와 항상 같다
   * (예전엔 아직 결과에 반영되지 않은 입력값이 URL에 먼저 실렸다).
   */
  debouncedKeyword: string
  selectedEventId: string | null
  bookmarksOnly: boolean
  selectedCategory: string
  selectedCountry: string
  selectedContinent: string
  selectedCentury: CenturyFilter
  sortBy: SortOption
  sortDirection: 'asc' | 'desc'
  showFlatView: boolean
  viewMode: ViewMode
  /**
   * 사용자가 뷰를 **명시적으로 골랐는가**(검토 URL-12). false면 `view` 키를 URL에 싣지
   * 않는다 — 디바이스가 추론한 기본값이 링크에 실려 받는 쪽의 판단을 덮어쓰지 않도록.
   */
  viewExplicit: boolean
  /** 페이지 크기 — 표시 선호. 새로고침·공유 시 보존 */
  pageSize: number
  /**
   * 타임라인 전용 축(검토 GAP-4) — 레인 기준과 숨긴 카테고리.
   * 위젯 지역 state였을 땐 URL에 실리지 않아 공유 링크가 화면을 재현하지 못했다.
   */
  timelineLane: TimelineLaneMode
  hiddenTimelineCategories: ReadonlySet<string>

  // 세터 (URL → state)
  setKeywordInput: (value: string) => void
  setSelectedEventId: (value: string | null) => void
  setBookmarksOnly: (value: boolean) => void
  setSelectedCategory: (value: string) => void
  setSelectedCountry: (value: string) => void
  setSelectedContinent: (value: string) => void
  setSelectedCentury: (value: CenturyFilter) => void
  setSortBy: (value: SortOption) => void
  setSortDirection: (value: 'asc' | 'desc') => void
  setShowFlatView: (value: boolean) => void
  setViewMode: (value: ViewMode) => void
  setViewExplicit: (value: boolean) => void
  setPageSize: (value: number) => void
  setTimelineLane: (lane: TimelineLaneMode) => void
  setHiddenTimelineCategories: (hidden: ReadonlySet<string>) => void
}

export function useCatalogUrlSync(args: CatalogUrlSyncArgs) {
  const {
    searchParams,
    setSearchParams,
    keywordInput,
    debouncedKeyword,
    selectedEventId,
    bookmarksOnly,
    selectedCategory,
    selectedCountry,
    selectedContinent,
    selectedCentury,
    sortBy,
    sortDirection,
    showFlatView,
    viewMode,
    viewExplicit,
    pageSize,
    timelineLane,
    hiddenTimelineCategories,
    setKeywordInput,
    setSelectedEventId,
    setBookmarksOnly,
    setSelectedCategory,
    setSelectedCountry,
    setSelectedContinent,
    setSelectedCentury,
    setSortBy,
    setSortDirection,
    setShowFlatView,
    setViewMode,
    setViewExplicit,
    setPageSize,
    setTimelineLane,
    setHiddenTimelineCategories,
  } = args

  /**
   * 우리(state → URL effect)가 마지막으로 쓴 URL serialized 값 — 순수 최적화다.
   * 시딩이 통일된 뒤로는 이 값과 같을 때 아래 비교를 전부 돌려도 setState가 하나도
   * 발생하지 않지만, 매 write마다 14번 비교를 반복할 이유가 없어 짧게 우회한다.
   */
  const lastSelfWriteRef = useRef<string | null>(null)

  /**
   * URL → 상태 단방향 동기화 — 외부 진입(뒤로가기·딥링크) 시 끌어와 반영.
   *
   * 중요: 파라미터가 *없는* 경우에도 기본값으로 복원해야 함.
   * 예전 구현처럼 `if (cat) setX(cat)`만 두면 사용자가 ✕로 필터를 풀어 URL에서 키가 빠진 뒤
   * 다른 필터 변경으로 effect가 재실행되면 직전 state가 그대로 남는 버그가 있었음.
   */
  useEffect(() => {
    if (lastSelfWriteRef.current === searchParams.toString()) return
    const next = parseCatalogSearchParams(searchParams)

    /**
     * 검색어는 **trim 기준**으로 비교한다(검토 URL-13). 입력창에는 사용자가 친 공백을
     * 남겨 두되, 공백만 남은 상태는 URL의 '키 없음'과 같은 값으로 본다 — 아니면
     * 공백을 입력하는 순간 URL write가 키를 지우고, 그 변화가 이 effect를 깨워
     * 입력창을 비워 버린다.
     */
    if (next.keyword !== keywordInput.trim()) setKeywordInput(next.keyword)

    if (next.selectedEventId !== selectedEventId)
      setSelectedEventId(next.selectedEventId)

    if (next.bookmarksOnly !== bookmarksOnly)
      setBookmarksOnly(next.bookmarksOnly)

    if (next.selectedCategory !== selectedCategory)
      setSelectedCategory(next.selectedCategory)

    if (next.selectedCountry !== selectedCountry)
      setSelectedCountry(next.selectedCountry)

    if (next.selectedContinent !== selectedContinent)
      setSelectedContinent(next.selectedContinent)

    if (next.selectedCentury !== selectedCentury)
      setSelectedCentury(next.selectedCentury)

    if (next.pageSize !== pageSize) setPageSize(next.pageSize)

    if (next.sortBy !== sortBy) setSortBy(next.sortBy)

    if (next.sortDirection !== sortDirection)
      setSortDirection(next.sortDirection)

    if (next.showFlatView !== showFlatView) setShowFlatView(next.showFlatView)

    if (next.viewMode !== viewMode) setViewMode(next.viewMode)
    if (next.viewExplicit !== viewExplicit) setViewExplicit(next.viewExplicit)

    if (next.timelineLane !== timelineLane) setTimelineLane(next.timelineLane)

    const hiddenChanged =
      next.hiddenTimelineCategories.size !== hiddenTimelineCategories.size ||
      Array.from(next.hiddenTimelineCategories).some(
        (name) => !hiddenTimelineCategories.has(name),
      )
    if (hiddenChanged)
      setHiddenTimelineCategories(next.hiddenTimelineCategories)
    // 의도적: 마운트 시·뒤로가기 시 한 번씩 끌어오면 충분. 양방향 동기화는 아래 effect에서.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams])

  /** 상태 → URL 단방향 동기화 — 사용자가 필터 조정 시 URL 갱신 */
  useEffect(() => {
    const next = new URLSearchParams(searchParams)
    const setOrDel = (
      key: string,
      value: string | null | undefined,
      defaultValue?: string,
    ) => {
      if (value && value !== defaultValue) next.set(key, value)
      else next.delete(key)
    }
    /**
     * 검색어는 **디바운스가 끝난 뒤에만** URL에 반영한다(검토 PERF-11).
     *
     * 대기 중(`debouncedKeyword !== keywordInput`)에는 `q`를 아예 건드리지 않는다 —
     * '지우고 250ms 뒤 다시 쓰기'가 아니라 **직전 값 보존**이어야 한다. 뒤로가기로
     * 들어와 URL→state가 입력창을 채운 직후의 250ms 창에서, 다른 축(카테고리 등)이
     * 바뀌어 이 effect가 먼저 돌면 아직 비어 있는 디바운스 값이 딥링크의 `q`를
     * 지워 버리기 때문이다.
     * (공백만 있는 검색어는 아무 것도 좁히지 않으므로 URL에 남기지 않는다 — 검토 URL-13.)
     */
    if (debouncedKeyword === keywordInput)
      setOrDel('q', debouncedKeyword.trim() || null)
    setOrDel('event', selectedEventId)
    setOrDel('bookmarks', bookmarksOnly ? '1' : null)
    setOrDel('cat', selectedCategory, FILTER_ALL)
    setOrDel('country', selectedCountry, FILTER_ALL)
    setOrDel('continent', selectedContinent, FILTER_ALL)
    setOrDel(
      'century',
      selectedCentury !== FILTER_ALL ? String(selectedCentury) : null,
    )
    setOrDel('size', pageSize !== DEFAULT_PAGE_SIZE ? String(pageSize) : null)
    setOrDel('sort', sortBy, DEFAULT_SORT)
    setOrDel('dir', sortDirection, DEFAULT_SORT_DIRECTION)
    setOrDel('flat', showFlatView ? '1' : null)
    /**
     * view는 **사용자가 직접 고른 경우에만** 기록한다(검토 URL-12).
     * 디폴트 viewMode는 디바이스에 따라 다른데(모바일 LIST, 데스크톱 TIMELINE) 예전엔
     * 그 추론값까지 항상 URL에 실어, 모바일에서 만든 링크가 데스크톱에서 목록을 강제하고
     * 데스크톱 링크가 모바일의 'LIST 폴백'(타임라인은 터치로 거의 조작 불가)을 무력화했다.
     */
    setOrDel('view', viewExplicit ? viewMode : null)
    // 타임라인 축 — 기본값(카테고리 레인 / 숨김 없음)이면 키를 싣지 않는다.
    setOrDel('lane', timelineLane, TIMELINE_LANE_MODES.CATEGORY)
    setOrDel(
      'hide',
      hiddenTimelineCategories.size > 0
        ? Array.from(hiddenTimelineCategories).join(',')
        : null,
    )
    const nextStr = next.toString()
    if (nextStr !== searchParams.toString()) {
      lastSelfWriteRef.current = nextStr
      setSearchParams(next, { replace: true })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    /**
     * ⚠️ 날것 `keywordInput`은 **deps에 없다**(검토 PERF-11) — 키 입력마다 이 effect가
     * 도는 것을 막는 것이 목적이다. 대기 중 판정에는 effect 본문이 매 렌더 새로 만들어지며
     * 캡처한 최신 `keywordInput`을 쓰므로 값이 낡을 일은 없고, 디바운스가 끝나면
     * `debouncedKeyword` 변화가 effect를 깨운다.
     */
    debouncedKeyword,
    selectedEventId,
    bookmarksOnly,
    selectedCategory,
    selectedCountry,
    selectedContinent,
    selectedCentury,
    sortBy,
    sortDirection,
    showFlatView,
    viewMode,
    viewExplicit,
    pageSize,
    timelineLane,
    hiddenTimelineCategories,
  ])
}
