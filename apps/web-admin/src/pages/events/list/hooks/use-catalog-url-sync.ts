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
  setSortBy: (v: SortOption) => void
  setSortDirection: (v: 'asc' | 'desc') => void
  setShowFlatView: (v: boolean) => void
  setViewMode: (v: ViewMode) => void
}

export function useCatalogUrlSync(args: CatalogUrlSyncArgs) {
  const {
    searchParams,
    setSearchParams,
    keywordInput,
    selectedEventId,
    bookmarksOnly,
    selectedCategory,
    selectedCountry,
    sortBy,
    sortDirection,
    showFlatView,
    viewMode,
    setKeywordInput,
    setSelectedEventId,
    setBookmarksOnly,
    setSelectedCategory,
    setSelectedCountry,
    setSortBy,
    setSortDirection,
    setShowFlatView,
    setViewMode,
  } = args

  /** URL → 상태 단방향 동기화 — 외부 진입(뒤로가기·딥링크) 시 한 번 끌어와 반영 */
  useEffect(() => {
    const q = searchParams.get('q')
    if (q !== null && q !== keywordInput) setKeywordInput(q)
    const ev = searchParams.get('event')
    if (ev !== selectedEventId) setSelectedEventId(ev)
    const bm = searchParams.get('bookmarks') === '1'
    if (bm !== bookmarksOnly) setBookmarksOnly(bm)
    const cat = searchParams.get('cat')
    if (cat && cat !== selectedCategory) setSelectedCategory(cat)
    const country = searchParams.get('country')
    if (country && country !== selectedCountry) setSelectedCountry(country)
    const sort = searchParams.get('sort')
    if (sort && sort !== sortBy) setSortBy(sort as SortOption)
    const dir = searchParams.get('dir')
    if ((dir === 'asc' || dir === 'desc') && dir !== sortDirection)
      setSortDirection(dir)
    const flat = searchParams.get('flat') === '1'
    if (flat !== showFlatView) setShowFlatView(flat)
    const v = searchParams.get('view')
    const nextView: ViewMode =
      v === VIEW_MODES.LIST ? VIEW_MODES.LIST : VIEW_MODES.TIMELINE
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
    setOrDel('sort', sortBy, 'recent')
    setOrDel('dir', sortDirection, 'desc')
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
    sortBy,
    sortDirection,
    showFlatView,
    viewMode,
  ])
}
