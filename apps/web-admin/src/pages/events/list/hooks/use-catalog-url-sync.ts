/**
 * URL ↔ 상태 양방향 동기화 (events catalog)
 *
 * - URL → 상태: 마운트 / 뒤로가기 / 딥링크 진입 시 검색 파라미터를 끌어와 반영
 * - 상태 → URL: 사용자가 필터/검색/뷰를 조정하면 URL을 갱신 (replace로 히스토리 부풀림 방지)
 */
import { useEffect } from 'react'
import type { useSearchParams } from 'react-router-dom'

import {
  FILTER_ALL,
  VIEW_MODES,
  type ViewMode,
} from '@/features/event-list/lib'
import type { SortOption } from '@/features/event-list/lib/constants'

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
  sortBy: SortOption
  sortDirection: 'asc' | 'desc'
  showFlatView: boolean
  viewMode: ViewMode

  // 세터 (URL → state)
  setKeywordInput: (v: string) => void
  setSelectedEventId: (v: string | null) => void
  setBookmarksOnly: (v: boolean) => void
  setSelectedCategory: (v: string) => void
  setSelectedCountry: (v: string) => void
  setSelectedContinent: (v: string) => void
  setSortBy: (v: SortOption) => void
  setSortDirection: (v: 'asc' | 'desc') => void
  setShowFlatView: (v: boolean) => void
  setViewMode: (v: ViewMode) => void
}

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
    sortBy,
    sortDirection,
    showFlatView,
    viewMode,
    setKeywordInput,
    setSelectedEventId,
    setBookmarksOnly,
    setSelectedCategory,
    setSelectedCountry,
    setSelectedContinent,
    setSortBy,
    setSortDirection,
    setShowFlatView,
    setViewMode,
  } = args

  /**
   * URL → 상태 단방향 동기화 — 외부 진입(뒤로가기·딥링크) 시 끌어와 반영.
   *
   * 중요: 파라미터가 *없는* 경우에도 기본값으로 복원해야 함.
   * 예전 구현처럼 `if (cat) setX(cat)`만 두면 사용자가 ✕로 필터를 풀어 URL에서 키가 빠진 뒤
   * 다른 필터 변경으로 effect가 재실행되면 직전 state가 그대로 남는 버그가 있었음.
   */
  useEffect(() => {
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

    const sort = (searchParams.get('sort') ?? DEFAULT_SORT) as SortOption
    if (sort !== sortBy) setSortBy(sort)

    const dirParam = searchParams.get('dir')
    const dir: 'asc' | 'desc' =
      dirParam === 'asc' || dirParam === 'desc' ? dirParam : DEFAULT_DIR
    if (dir !== sortDirection) setSortDirection(dir)

    const flat = searchParams.get('flat') === '1'
    if (flat !== showFlatView) setShowFlatView(flat)

    const v = searchParams.get('view')
    const validViews = Object.values(VIEW_MODES) as ViewMode[]
    const nextView: ViewMode =
      v && (validViews as string[]).includes(v)
        ? (v as ViewMode)
        : VIEW_MODES.TIMELINE
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
    setOrDel('sort', sortBy, DEFAULT_SORT)
    setOrDel('dir', sortDirection, DEFAULT_DIR)
    setOrDel('flat', showFlatView ? '1' : null)
    setOrDel('view', viewMode, VIEW_MODES.TIMELINE)
    if (next.toString() !== searchParams.toString()) {
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
    sortBy,
    sortDirection,
    showFlatView,
    viewMode,
  ])
}
