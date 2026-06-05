/**
 * URL ↔ 상태 양방향 동기화 (events catalog)
 *
 * - URL → 상태: 마운트 / 뒤로가기 / 딥링크 진입 시 검색 파라미터를 끌어와 반영
 * - 상태 → URL: 사용자가 필터/검색/뷰를 조정하면 URL을 갱신 (replace로 히스토리 부풀림 방지)
 *
 * 두 effect 사이의 redundant work 방지를 위해 `lastSelfWriteRef`로 "방금 우리가 쓴 URL"을
 * 기억해두고, URL → 상태 effect가 그 값과 같으면 짧게 우회한다.
 */
import { useEffect, useRef } from 'react'
import type { useSearchParams } from 'react-router-dom'

import type { CenturyFilter } from '@/entities/event/model'
import { FILTER_ALL, type ViewMode } from '@/features/event-list/lib'
import type { SortOption } from '@/features/event-list/lib/constants'

import { resolveDefaultViewMode } from '../lib/resolve-default-view-mode'

interface CatalogUrlSyncArgs {
  searchParams: URLSearchParams
  setSearchParams: ReturnType<typeof useSearchParams>[1]

  // 상태 (URL ← state)
  keywordInput: string
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
  /** 페이지 크기 — 표시 선호. 새로고침·공유 시 보존 */
  pageSize: number

  // 세터 (URL → state)
  setKeywordInput: (v: string) => void
  setSelectedEventId: (v: string | null) => void
  setBookmarksOnly: (v: boolean) => void
  setSelectedCategory: (v: string) => void
  setSelectedCountry: (v: string) => void
  setSelectedContinent: (v: string) => void
  setSelectedCentury: (v: CenturyFilter) => void
  setSortBy: (v: SortOption) => void
  setSortDirection: (v: 'asc' | 'desc') => void
  setShowFlatView: (v: boolean) => void
  setViewMode: (v: ViewMode) => void
  setPageSize: (v: number) => void
}

/** URL에 노출하는 유효 page size — 그 외 값은 기본(100)으로 폴백 */
const VALID_PAGE_SIZES = [20, 50, 100]
const DEFAULT_PAGE_SIZE = 100

const DEFAULT_SORT: SortOption = 'recent' as SortOption
const DEFAULT_DIR: 'asc' | 'desc' = 'desc'

export function useCatalogUrlSync(args: CatalogUrlSyncArgs) {
  const {
    searchParams,
    setSearchParams,
    keywordInput,
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
    pageSize,
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
    setPageSize,
  } = args

  /** 우리(state → URL effect)가 마지막으로 쓴 URL serialized 값. 이 값과 동일하면
   *  URL → state effect가 무의미한 비교 11번을 건너뜀. */
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
    const q = searchParams.get('q') ?? ''
    if (q !== keywordInput) setKeywordInput(q)

    const ev = searchParams.get('event')
    if (ev !== selectedEventId) setSelectedEventId(ev)

    const bm = searchParams.get('bookmarks') === '1'
    if (bm !== bookmarksOnly) setBookmarksOnly(bm)

    const cat = searchParams.get('cat') ?? FILTER_ALL
    if (cat !== selectedCategory) setSelectedCategory(cat)

    const country = searchParams.get('country') ?? FILTER_ALL
    if (country !== selectedCountry) setSelectedCountry(country)

    const continent = searchParams.get('continent') ?? FILTER_ALL
    if (continent !== selectedContinent) setSelectedContinent(continent)

    const centuryParam = searchParams.get('century')
    const centuryNum = centuryParam ? Number(centuryParam) : NaN
    const century: CenturyFilter = Number.isFinite(centuryNum)
      ? centuryNum
      : FILTER_ALL
    if (century !== selectedCentury) setSelectedCentury(century)

    const sizeNum = Number(searchParams.get('size'))
    const size = VALID_PAGE_SIZES.includes(sizeNum)
      ? sizeNum
      : DEFAULT_PAGE_SIZE
    if (size !== pageSize) setPageSize(size)

    const sort = (searchParams.get('sort') ?? DEFAULT_SORT) as SortOption
    if (sort !== sortBy) setSortBy(sort)

    const dirParam = searchParams.get('dir')
    const dir: 'asc' | 'desc' =
      dirParam === 'asc' || dirParam === 'desc' ? dirParam : DEFAULT_DIR
    if (dir !== sortDirection) setSortDirection(dir)

    const flat = searchParams.get('flat') === '1'
    if (flat !== showFlatView) setShowFlatView(flat)

    const nextView = resolveDefaultViewMode(searchParams.get('view'))
    if (nextView !== viewMode) setViewMode(nextView)
    // 의도적: 마운트 시·뒤로가기 시 한 번씩 끌어오면 충분. 양방향 동기화는 아래 effect에서.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams])

  /** 상태 → URL 단방향 동기화 — 사용자가 필터 조정 시 URL 갱신 */
  useEffect(() => {
    const next = new URLSearchParams(searchParams)
    const setOrDel = (k: string, v: string | null | undefined, def?: string) => {
      if (v && v !== def) next.set(k, v)
      else next.delete(k)
    }
    setOrDel('q', keywordInput || null)
    setOrDel('event', selectedEventId)
    setOrDel('bookmarks', bookmarksOnly ? '1' : null)
    setOrDel('cat', selectedCategory, FILTER_ALL)
    setOrDel('country', selectedCountry, FILTER_ALL)
    setOrDel('continent', selectedContinent, FILTER_ALL)
    setOrDel(
      'century',
      selectedCentury !== FILTER_ALL ? String(selectedCentury) : null,
    )
    setOrDel(
      'size',
      pageSize !== DEFAULT_PAGE_SIZE ? String(pageSize) : null,
    )
    setOrDel('sort', sortBy, DEFAULT_SORT)
    setOrDel('dir', sortDirection, DEFAULT_DIR)
    setOrDel('flat', showFlatView ? '1' : null)
    /* 디폴트 viewMode가 디바이스에 따라 다름(모바일 LIST, 데스크톱 TIMELINE)이므로
     * default 인자 없이 항상 view 키를 명시. URL 공유 시 viewMode 정확히 보존. */
    setOrDel('view', viewMode)
    const nextStr = next.toString()
    if (nextStr !== searchParams.toString()) {
      lastSelfWriteRef.current = nextStr
      setSearchParams(next, { replace: true })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    keywordInput,
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
    pageSize,
  ])
}
