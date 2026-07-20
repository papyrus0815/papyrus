/**
 * Events Catalog Page
 * FSD: pages/events/list
 *
 * 조립(composition) 레이어. 비즈니스 로직은 features/entities, UI는 widgets/components,
 * 페이지 전용 훅은 ./hooks/* 에 위임한다.
 */
import React, {
  Suspense,
  lazy,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from 'react'

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { FiAlertTriangle, FiPlus, FiRefreshCw } from 'react-icons/fi'
import { useNavigate, useSearchParams } from 'react-router-dom'

import { useEvents } from '@/entities/event/model'
import { getEventsCount } from '@/shared/api/events'
import { eventKeys } from '@/pages/events/detail/use-event-detail'
import { useEventFilters } from '@/features/event-filters/model'
import { useEventHierarchy } from '@/features/event-hierarchy/model'
import { VIEW_MODES, type ViewMode } from '@/features/event-list/lib'
import type { SortOption } from '@/features/event-list/lib/constants'
import { pathKeys } from '@/shared/router'
import { confirm } from '@/shared/ui/confirm-dialog'
import { useBookmarks } from '@/shared/hooks/use-bookmarks.hook'
import { useDebouncedValue } from '@/shared/hooks/use-debounced-value'
import { useRecentEvents } from '@/shared/hooks/use-recent-events.hook'
import { EventCompactList } from '@/widgets/event-list-compact/ui/event-compact-list'
import { EventTimeline } from '@/widgets/event-timeline/ui/event-timeline'
import { EventDetailPanel } from '@/widgets/event-list/ui/event-detail-panel'

/**
 * 신규 5개 뷰는 lazy import — 사용자가 그 모드를 한 번도 안 열면 코드 안 받음.
 * 특히 Map은 Leaflet/마커 클러스터 ~150KB.
 *
 * 각 모듈은 named export `Event*View`이므로 default 어댑터로 매핑.
 */
const EventMapView = lazy(() =>
  import('@/widgets/event-map-view/ui/event-map-view').then((m) => ({
    default: m.EventMapView,
  })),
)
const EventGridView = lazy(() =>
  import('@/widgets/event-grid-view/ui/event-grid-view').then((m) => ({
    default: m.EventGridView,
  })),
)
const EventDashboardView = lazy(() =>
  import('@/widgets/event-dashboard-view/ui/event-dashboard-view').then((m) => ({
    default: m.EventDashboardView,
  })),
)
const EventTreeView = lazy(() =>
  import('@/widgets/event-tree-view/ui/event-tree-view').then((m) => ({
    default: m.EventTreeView,
  })),
)
const EventGalleryView = lazy(() =>
  import('@/widgets/event-gallery-view/ui/event-gallery-view').then((m) => ({
    default: m.EventGalleryView,
  })),
)

import type {
  EventHierarchyNode,
  HistoricalEvent,
} from '../create/events.types'
import * as Layout from '../styles/layout.styles'
import * as PageStyles from '../styles/list-page.styles'

import { CatalogDetailDrawer } from './components/catalog-detail-drawer'
import { CatalogEntityFilterModals } from './components/catalog-entity-filter-modals'
import { CatalogMainContent } from './components/catalog-main-content'
import { CatalogOverlayModals } from './components/catalog-overlay-modals'
import { CatalogToolbar } from './components/catalog-toolbar'
import { useCatalogEventIndex } from './hooks/use-catalog-event-index'
import { useCatalogModals } from './hooks/use-catalog-modals'
import { useCatalogReferenceData } from './hooks/use-catalog-reference-data'
import {
  useCatalogListNavigation,
  useCatalogShortcuts,
} from './hooks/use-catalog-keyboard'
import { useCatalogUrlSync } from './hooks/use-catalog-url-sync'
import { exportEventsAsJson } from './lib/export-events'
import { resolveDefaultViewMode } from './lib/resolve-default-view-mode'

/** 집중(넓게) 보기 선택 영속 키 — 세션 간 유지. 모듈 스코프(렌더마다 재생성 회피). */
const WIDE_MODE_KEY = 'papyrus.events.wideMode'

export interface EventsCatalogPageProps {
  /** 국가(현대/역사적) ID로 연관 사건만 표시. 미전달 시 전체 사건 */
  countryId?: string | null
  /** 대시보드 등에 임베드 시 상단 타이틀/여백 축소 */
  embed?: boolean
}

export const EventsCatalogPage: React.FC<EventsCatalogPageProps> = ({
  countryId,
  embed = false,
}) => {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [searchParams, setSearchParams] = useSearchParams()

  // ===== 검색 / 페이지 상태 =====
  const [bookmarksOnly, setBookmarksOnly] = useState(
    searchParams.get('bookmarks') === '1',
  )
  const searchInputRef = useRef<HTMLInputElement | null>(null)
  // 기본 page size 100 — 타임라인 뷰가 한 번에 더 많은 사건을 보여주도록.
  // 사용자는 toolbar의 page size 컨트롤로 변경 가능.
  const [pageSize, setPageSize] = useState(100)

  // ===== 집중(넓게) 보기 =====
  // 페이지 헤더·뷰 힌트·타임라인 미니맵을 접어 콘텐츠 본문에 세로 공간(~250px)을 양보.
  // 토글 1회로 켜고 끄며 선택은 localStorage에 영속(다음 방문에도 유지).
  const [wideMode, setWideMode] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false
    try {
      const saved = window.localStorage.getItem(WIDE_MODE_KEY)
      if (saved === '1') return true
      if (saved === '0') return false
      // 미설정(최초 방문) — 짧은 뷰포트(노트북류, < 860px)면 자동으로 집중 모드로
      // 시작해 첫 진입 가독성을 확보. 큰 모니터(≥ 860px)는 미니맵을 유지.
      // 사용자가 토글하면 '1'/'0'이 저장돼 이후엔 그 선택이 항상 우선.
      return window.innerHeight < 860
    } catch {
      return false
    }
  })
  const toggleWideMode = useCallback(() => {
    setWideMode((prev) => {
      const next = !prev
      try {
        window.localStorage.setItem(WIDE_MODE_KEY, next ? '1' : '0')
      } catch {
        /* storage 비활성 — 세션 내 토글만 동작 */
      }
      return next
    })
  }, [])

  // ===== 북마크 / 최근 본 =====
  const { bookmarks, toggleBookmark } = useBookmarks()
  const { recentEvents, addRecentEvent } = useRecentEvents()

  // ===== Entity: 사건 데이터 =====
  // useEvents는 React Query 무한 스크롤로 전환됨(a1b5b6f85).
  const {
    events,
    isLoading,
    isFetchingNextPage,
    isError,
    hasMore,
    fetchMoreEvents,
    refetch: refetchEvents,
  } = useEvents({
    pageSize,
    countryId: countryId ?? undefined,
  })

  // ===== 권위 총개수 — 헤더 "전체 N건"이 *로드된 수*가 아닌 진짜 총량을 표시하도록 =====
  // 페이징 응답엔 total이 없어 별도 count 엔드포인트 조회(가벼운 count 쿼리). 실패 시 undefined.
  const { data: serverTotal } = useQuery({
    queryKey: [...eventKeys.count(), countryId ?? null],
    queryFn: () => getEventsCount({ countryId: countryId ?? undefined }),
    staleTime: 30_000,
  })

  // ===== 참조 데이터 (카테고리·국가·대륙) =====
  const { dbCategories, countries, historicalCountries, continents } =
    useCatalogReferenceData()

  // ===== Feature: 필터 =====
  const {
    selectedCategory,
    sortBy,
    sortDirection,
    selectedCentury,
    selectedCountry,
    selectedContinent,
    showFlatView,
    setSelectedCategory,
    setKeyword,
    setSortBy,
    setSortDirection,
    setSelectedCentury,
    setSelectedCountry,
    setSelectedContinent,
    setShowFlatView,
    availableCenturies,
    sortedEvents,
    filterSummaryChips,
    hasActiveFilters,
    handleResetFilters,
  } = useEventFilters(
    events,
    dbCategories,
    countries,
    historicalCountries,
    continents,
  )

  // ===== Feature: 계층 / 직책 =====
  const {
    expandedEventIds,
    setExpandedEventIds,
    toggleEventExpansion,
    flattenedHierarchy,
  } = useEventHierarchy(
    sortedEvents,
    events,
    showFlatView,
    sortBy,
    sortDirection,
  )

  // ===== UI 상태 =====
  // 디폴트 viewMode 결정: URL 우선 → 모바일이면 LIST → 데스크톱이면 TIMELINE.
  // 타임라인은 가로 panning이 Space+드래그·Ctrl+휠뿐이라 터치 디바이스에서 사실상 비-인터랙티브 →
  // 첫 진입을 LIST로 두고, 사용자가 명시적으로 타임라인을 선택하면 그 선택은 URL로 보존됨.
  // useCatalogUrlSync도 동일 디폴트를 사용해야 첫 마운트 직후 force-overwrite를 피함.
  const [viewMode, setViewMode] = useState<ViewMode>(() =>
    resolveDefaultViewMode(searchParams.get('view')),
  )
  /**
   * 뷰 전환(시간↔카테고리↔타임라인 등)은 전체 pivot을 같은 events로 다시 그리는
   * *무거운 동기 재렌더*다(특히 가상화 안 된 뷰). 사용자 클릭은 startTransition으로
   * 비긴급 처리해 전환 중에도 버튼/UI가 멈추지 않게 한다. URL→state 동기화 경로는
   * 그대로 raw setViewMode를 사용한다.
   */
  const [, startViewTransition] = useTransition()
  const changeViewMode = useCallback(
    (next: ViewMode) => startViewTransition(() => setViewMode(next)),
    [],
  )
  const [selectedEventId, setSelectedEventId] = useState<string | null>(
    searchParams.get('event'),
  )

  /** 키워드 디바운스 — 입력 자체는 즉시 반영(체감)하되 useEventFilters에 흘려보내는 값만 250ms로 묶음.
   * `isSearchPending`은 디바운스 idle 구간을 toolbar의 spinner로 노출 (UX: 적용됐는지 인지) */
  const [keywordInput, setKeywordInput] = useState(searchParams.get('q') ?? '')
  const debouncedKeyword = useDebouncedValue(keywordInput, 250)
  const isSearchPending = debouncedKeyword !== keywordInput
  useEffect(() => {
    setKeyword(debouncedKeyword)
    // setKeyword는 useEventFilters 내부의 setter — 안정적
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedKeyword])

  // ===== 모달 상태 묶음 (스크롤 잠금 effect 포함) =====
  const {
    shortcutHelpOpen,
    setShortcutHelpOpen,
    closeShortcutHelp,
    openShortcutHelp,
    showCategoryModal,
    setShowCategoryModal,
    showCountryModal,
    setShowCountryModal,
    showSummaryModal,
    setShowSummaryModal,
    summaryEventId,
    openSummary,
  } = useCatalogModals()

  // ===== 사건 선택 시 최근 본 목록에 추가 =====
  useEffect(() => {
    if (selectedEventId) {
      addRecentEvent(selectedEventId)
    }
  }, [selectedEventId, addRecentEvent])

  // ===== id 기반 lookup map =====
  const { eventByIdMap, nodeIndexMap } = useCatalogEventIndex(events)

  // ===== URL ↔ 상태 동기화 =====
  useCatalogUrlSync({
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
  })

  // ===== 페이지네이션 핸들러 =====
  // pageSize state 변경만으로 react-query queryKey가 바뀌어 새 페이지로 자동 fetch됨
  const handlePageSizeChange = useCallback((newSize: number) => {
    setPageSize(newSize)
  }, [])

  // ===== 북마크 필터 — flattenedHierarchy를 한 번 더 거름 =====
  const visibleFlattenedHierarchy = useMemo(() => {
    if (!bookmarksOnly) return flattenedHierarchy
    return flattenedHierarchy.filter((item) => bookmarks.has(item.node.id))
  }, [flattenedHierarchy, bookmarksOnly, bookmarks])

  // ===== 키보드 단축키 + 리스트 네비게이션 =====
  const clearSelectedEvent = useCallback(() => setSelectedEventId(null), [])
  useCatalogShortcuts({
    searchInputRef,
    shortcutHelpOpen,
    setShortcutHelpOpen,
    closeShortcutHelp,
    selectedEventId,
    clearSelectedEvent,
  })
  useCatalogListNavigation({
    visibleList: visibleFlattenedHierarchy,
    selectedEventId,
    setSelectedEventId,
    navigate,
  })

  // ===== Pagination: 스크롤 감지 =====
  // 임계값을 고정 300px → viewport 비율로. 모바일 600px 화면에서 300px 임계는 한 화면의 절반 →
  // 너무 일찍/자주 트리거됨. clientHeight의 40%(또는 최소 200)면 데스크톱·모바일 모두 자연스러움.
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget
    const scrollBottom =
      target.scrollHeight - target.scrollTop - target.clientHeight
    const threshold = Math.max(200, target.clientHeight * 0.4)
    if (scrollBottom < threshold && hasMore && !isLoading) {
      fetchMoreEvents()
    }
  }

  // ===== 선택된 이벤트/노드 — lookup map으로 O(1) 조회 =====
  const selectedEvent = useMemo<HistoricalEvent | null>(() => {
    if (!selectedEventId) return null
    return (
      eventByIdMap.get(selectedEventId) ??
      nodeIndexMap.get(selectedEventId)?.rootEvent ??
      null
    )
  }, [selectedEventId, eventByIdMap, nodeIndexMap])

  const selectedNode = useMemo<EventHierarchyNode | null>(() => {
    if (!selectedEventId) return null
    return nodeIndexMap.get(selectedEventId)?.node ?? null
  }, [selectedEventId, nodeIndexMap])

  const summaryNode = useMemo<EventHierarchyNode | null>(() => {
    if (!summaryEventId) return null
    return nodeIndexMap.get(summaryEventId)?.node ?? null
  }, [summaryEventId, nodeIndexMap])

  const filtersOrSearchActive =
    hasActiveFilters || bookmarksOnly || keywordInput.trim().length > 0
  const activeFilterCount = filterSummaryChips.length + (bookmarksOnly ? 1 : 0)

  /** 필터/북마크/검색 일괄 초기화 (위젯 EmptyCatalogState에 전달) */
  const handleResetAll = useCallback(() => {
    handleResetFilters()
    setKeywordInput('')
    setBookmarksOnly(false)
  }, [handleResetFilters])

  // ===== 자식으로 전달되는 핸들러 — useCallback으로 ref 안정화 =====
  const handleExpandEvent = useCallback((eventId: string) => {
    setExpandedEventIds((prev) => {
      const next = new Set(prev)
      next.add(eventId)
      return next
    })
  }, [setExpandedEventIds])
  const toggleShowFlatView = useCallback(
    () => setShowFlatView((v) => !v),
    [setShowFlatView],
  )
  const toggleBookmarksOnly = useCallback(
    () => setBookmarksOnly((v) => !v),
    [],
  )
  const handleCreateEvent = useCallback(
    () => navigate(pathKeys.events.create()),
    [navigate],
  )
  const handleExportJson = useCallback(async () => {
    const exported = visibleFlattenedHierarchy.map(
      (it) =>
        eventByIdMap.get(it.node.id) ??
        nodeIndexMap.get(it.node.id)?.rootEvent ??
        null,
    )
    // 현재 화면은 로드·필터된 일부만 → 전체보다 적으면 부분 내보내기임을 확인.
    // serverTotal은 *최상위(parentEventId=null)* 개수이므로, 부분 여부 판정은
    // 로드된 *최상위* 수(depth 0)로 비교해야 한다. exportedCount(하위 포함)로 비교하면
    // 자식이 많을 때 exportedCount>serverTotal이 되어 부분 경고가 조용히 억제됐다.
    const exportedCount = exported.filter(Boolean).length
    const loadedRootCount = visibleFlattenedHierarchy.filter(
      (item) => item.depth === 0,
    ).length
    if (
      typeof serverTotal === 'number' &&
      loadedRootCount < serverTotal &&
      !(await confirm({
        title: '확인',
        message: `등록된 최상위 사건 ${serverTotal.toLocaleString()}건 중 현재 로드·필터된 ${loadedRootCount.toLocaleString()}건(하위 사건 포함 ${exportedCount.toLocaleString()}건)만 내보냅니다. 계속할까요?`,
      }))
    ) {
      return
    }
    exportEventsAsJson(exported)
  }, [visibleFlattenedHierarchy, eventByIdMap, nodeIndexMap, serverTotal])

  /** lazy 슬롯 fallback — 위젯 chunk 다운로드 동안 유지되는 빈 박스. layout shift 방지. */
  const lazyFallback = (
    <PageStyles.LazyViewFallback aria-busy="true" aria-live="polite">
      <PageStyles.LazyViewSpinner aria-hidden="true" />
      <span>뷰 불러오는 중…</span>
    </PageStyles.LazyViewFallback>
  )

  /**
   * 활성 viewMode에 해당하는 슬롯 *하나만* 빌드.
   * 이전엔 7개 슬롯의 React element를 매 렌더마다 모두 생성했으나, 한 번에 하나만 그려지므로
   * 나머지 6개의 prop computation은 순수 낭비였음. switch로 한 슬롯만 만든다.
   */
  let activeSlot: React.ReactNode
  switch (viewMode) {
    case VIEW_MODES.MAP:
      activeSlot = (
        <Suspense fallback={lazyFallback}>
          <EventMapView
            flattenedHierarchy={visibleFlattenedHierarchy}
            events={events}
            selectedEventId={selectedEventId}
            onSelectEvent={setSelectedEventId}
            hasActiveFilters={filtersOrSearchActive}
            onResetFilters={handleResetAll}
          />
        </Suspense>
      )
      break
    case VIEW_MODES.GRID:
      activeSlot = (
        <Suspense fallback={lazyFallback}>
          <EventGridView
            flattenedHierarchy={visibleFlattenedHierarchy}
            events={events}
            selectedEventId={selectedEventId}
            dbCategories={dbCategories}
            onSelectEvent={setSelectedEventId}
          />
        </Suspense>
      )
      break
    case VIEW_MODES.DASHBOARD:
      activeSlot = (
        <Suspense fallback={lazyFallback}>
          <EventDashboardView
            flattenedHierarchy={visibleFlattenedHierarchy}
            events={events}
            dbCategories={dbCategories}
            onSelectEvent={setSelectedEventId}
            serverTotal={serverTotal}
          />
        </Suspense>
      )
      break
    case VIEW_MODES.TREE:
      activeSlot = (
        <Suspense fallback={lazyFallback}>
          <EventTreeView
            flattenedHierarchy={visibleFlattenedHierarchy}
            events={events}
            selectedEventId={selectedEventId}
            dbCategories={dbCategories}
            onSelectEvent={setSelectedEventId}
          />
        </Suspense>
      )
      break
    case VIEW_MODES.GALLERY:
      activeSlot = (
        <Suspense fallback={lazyFallback}>
          <EventGalleryView
            flattenedHierarchy={visibleFlattenedHierarchy}
            events={events}
            selectedEventId={selectedEventId}
            dbCategories={dbCategories}
            onSelectEvent={setSelectedEventId}
          />
        </Suspense>
      )
      break
    case VIEW_MODES.LIST:
      activeSlot = (
        <EventCompactList
          isLoading={isLoading && events.length === 0}
          flattenedHierarchy={visibleFlattenedHierarchy}
          events={events}
          expandedEventIds={expandedEventIds}
          selectedEventId={selectedEventId}
          sortDirection={sortDirection}
          hasActiveFilters={filtersOrSearchActive}
          activeFilterChips={
            bookmarksOnly
              ? [
                  ...filterSummaryChips,
                  {
                    key: 'bookmarks',
                    label: '북마크만',
                    onClear: () => setBookmarksOnly(false),
                  },
                ]
              : filterSummaryChips
          }
          dbCategories={dbCategories}
          isLoadingMore={isLoading && events.length > 0}
          displayedCount={visibleFlattenedHierarchy.length}
          hasMoreData={hasMore}
          bookmarks={bookmarks}
          searchQuery={debouncedKeyword}
          recentEventIds={recentEvents}
          onToggleExpansion={toggleEventExpansion}
          onSelectEvent={setSelectedEventId}
          onShowSummary={openSummary}
          onResetFilters={handleResetAll}
          onToggleBookmark={toggleBookmark}
          onScroll={handleScroll}
          pageSize={pageSize}
        />
      )
      break
    case VIEW_MODES.TIMELINE:
    default:
      activeSlot = (
        <EventTimeline
          flattenedHierarchy={visibleFlattenedHierarchy}
          events={events}
          selectedEventId={selectedEventId}
          dbCategories={dbCategories}
          continents={continents}
          countries={countries}
          onSelectEvent={setSelectedEventId}
          hasMore={hasMore}
          isFetchingMore={isFetchingNextPage}
          onLoadMore={fetchMoreEvents}
          isLoading={isLoading && events.length === 0}
          wideMode={wideMode}
        />
      )
  }

  const handleAfterDelete = useCallback(
    (deletedId: string) => {
      // 선택 해제 + React Query 캐시 invalidate (페이지 reload 회피)
      // 목록(['events'])과 헤더 총개수(['events-count']) 모두 무효화 — 안 하면
      // 삭제 후 헤더 "전체 N건"이 staleTime 동안 옛 값을 유지.
      if (selectedEventId === deletedId) setSelectedEventId(null)
      queryClient.invalidateQueries({ queryKey: eventKeys.lists() })
      queryClient.invalidateQueries({ queryKey: eventKeys.count() })
    },
    [selectedEventId, queryClient],
  )

  // ===== drawer 안 prev/next — visibleFlattenedHierarchy 기준. 끝에서는 undefined =====
  const selectedIndex = useMemo(() => {
    if (!selectedEventId) return -1
    return visibleFlattenedHierarchy.findIndex(
      (it) => it.node.id === selectedEventId,
    )
  }, [selectedEventId, visibleFlattenedHierarchy])

  const onDrawerPrev = useMemo(() => {
    if (selectedIndex <= 0) return undefined
    return () => {
      const prev = visibleFlattenedHierarchy[selectedIndex - 1]
      if (prev) setSelectedEventId(prev.node.id)
    }
  }, [selectedIndex, visibleFlattenedHierarchy])

  const onDrawerNext = useMemo(() => {
    if (
      selectedIndex < 0 ||
      selectedIndex >= visibleFlattenedHierarchy.length - 1
    )
      return undefined
    return () => {
      const next = visibleFlattenedHierarchy[selectedIndex + 1]
      if (next) setSelectedEventId(next.node.id)
    }
  }, [selectedIndex, visibleFlattenedHierarchy])

  const detailPanelSlot = (
    <EventDetailPanel
      isLoading={false}
      selectedEvent={selectedEvent}
      selectedNode={selectedNode}
      dbCategories={dbCategories}
      onSelectEvent={setSelectedEventId}
      onExpandEvent={handleExpandEvent}
      onShowSummary={openSummary}
      onAfterDelete={handleAfterDelete}
      onPrev={onDrawerPrev}
      onNext={onDrawerNext}
      onClose={clearSelectedEvent}
    />
  )


  // ===== 묶음 props (toolbar/modals) =====
  const toolbarProps = {
    searchInputRef,
    keywordInput,
    setKeywordInput,
    isSearchPending,
    selectedCategory,
    selectedCountry,
    selectedContinent,
    selectedCentury,
    showFlatView,
    dbCategories,
    availableCenturies,
    countries,
    historicalCountries,
    continents,
    setShowCategoryModal,
    setShowCountryModal,
    toggleShowFlatView,
    setSelectedCentury,
    onSelectCategory: setSelectedCategory,
    onSelectCountry: setSelectedCountry,
    onSelectContinent: setSelectedContinent,
    bookmarksOnly,
    toggleBookmarksOnly,
    bookmarksCount: bookmarks.size,
    recentEventIds: recentEvents,
    events,
    onSelectEvent: setSelectedEventId,
    onExportJson: handleExportJson,
    onOpenShortcutHelp: openShortcutHelp,
    onCreateEvent: handleCreateEvent,
    filterSummaryChips,
    activeFilterCount,
    handleResetAll,
  }

  // ===== 표시 옵션 묶음 (CatalogMainContent의 ViewSwitcherRow가 소비) =====
  const handleSortChange = useCallback(
    (newSortBy: SortOption) => {
      setSortBy(newSortBy)
      if (newSortBy === 'recent' || newSortBy === 'duration') {
        setSortDirection('desc')
      }
    },
    [setSortBy, setSortDirection],
  )

  const handleSortDirectionToggle = useCallback(() => {
    setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'))
  }, [setSortDirection])

  const entityFilterModalProps = {
    showCategoryModal,
    setShowCategoryModal,
    dbCategories,
    selectedCategory,
    setSelectedCategory,
    showCountryModal,
    setShowCountryModal,
    countries,
    historicalCountries,
    selectedCountry,
    setSelectedCountry,
  }

  const overlayModalProps = {
    shortcutHelpOpen,
    closeShortcutHelp,
    showSummaryModal,
    setShowSummaryModal,
    summaryNode,
  }

  const content = (
    <>
      {/* 집중(넓게) 보기에선 페이지 헤더를 접어 본문에 높이 양보 */}
      {wideMode ? null : embed ? (
        <PageStyles.EmbedHeader>
          연대표
          {countryId && (
            <PageStyles.EmbedHeaderHint>
              · 선택한 국가에 연관된 사건
            </PageStyles.EmbedHeaderHint>
          )}
        </PageStyles.EmbedHeader>
      ) : (
        <PageStyles.PageHeader>
          <PageStyles.PageHeaderTitleGroup>
            <PageStyles.PageHeaderTitle>사건 연대표</PageStyles.PageHeaderTitle>
            {countryId && (
              <PageStyles.PageHeaderSubtitle>
                선택한 국가에 연관된 역사적 사건
              </PageStyles.PageHeaderSubtitle>
            )}
          </PageStyles.PageHeaderTitleGroup>
        </PageStyles.PageHeader>
      )}

      <CatalogToolbar {...toolbarProps} />

      {isError && events.length === 0 ? (
        <PageStyles.ErrorBanner role="alert">
          <FiAlertTriangle size={32} aria-hidden="true" />
          <PageStyles.ErrorBannerTitle>
            사건을 불러오지 못했습니다
          </PageStyles.ErrorBannerTitle>
          <PageStyles.ErrorBannerDesc>
            네트워크 또는 서버 오류일 수 있습니다. 잠시 후 다시 시도해 주세요.
          </PageStyles.ErrorBannerDesc>
          <PageStyles.ErrorRetryButton
            type="button"
            onClick={() => refetchEvents()}
          >
            <FiRefreshCw size={14} aria-hidden="true" />
            다시 시도
          </PageStyles.ErrorRetryButton>
        </PageStyles.ErrorBanner>
      ) : (
        /**
         * 사건 미선택 = 우측 상세 패널 *완전 미렌더* → CatalogSplit이 1-col로 메인 뷰가 풀 폭.
         * 사건 클릭 시에만 drawer 마운트되어 데스크톱 column 표시 / 모바일 슬라이드인.
         */
        <Layout.CatalogSplit $hasSelection={!!selectedEventId}>
        <CatalogMainContent
          viewMode={viewMode}
          setViewMode={changeViewMode}
          visibleCount={visibleFlattenedHierarchy.length}
          totalCount={events.length}
          serverTotal={serverTotal}
          events={events}
          dbCategories={dbCategories}
          sortBy={sortBy}
          sortDirection={sortDirection}
          onSortChange={handleSortChange}
          onSortDirectionToggle={handleSortDirectionToggle}
          pageSize={pageSize}
          onPageSizeChange={handlePageSizeChange}
          wideMode={wideMode}
          onToggleWideMode={toggleWideMode}
          activeSlot={activeSlot}
        />
        {selectedEventId && (
          <CatalogDetailDrawer
            open
            onClose={clearSelectedEvent}
            title={selectedEvent?.title ?? selectedNode?.title ?? null}
          >
            {detailPanelSlot}
          </CatalogDetailDrawer>
        )}
        </Layout.CatalogSplit>
      )}
    </>
  )

  return (
    <>
      {embed ? (
        <PageStyles.EmbedWrapper>{content}</PageStyles.EmbedWrapper>
      ) : (
        <Layout.PageScene>
          <Layout.PageWrapper>{content}</Layout.PageWrapper>
        </Layout.PageScene>
      )}

      {/* 모바일 우하단 FAB — embed 모드에선 부모가 자체 CTA를 가질 가능성이 높아 미렌더 */}
      {!embed && (
        <Layout.CreateEventFab
          type="button"
          aria-label="새 사건 등록"
          onClick={handleCreateEvent}
        >
          <FiPlus size={24} aria-hidden="true" />
        </Layout.CreateEventFab>
      )}

      <CatalogEntityFilterModals {...entityFilterModalProps} />
      <CatalogOverlayModals {...overlayModalProps} />
    </>
  )
}

export default EventsCatalogPage
