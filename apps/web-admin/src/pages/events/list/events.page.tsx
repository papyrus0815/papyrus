/**
 * Events Catalog Page
 * FSD: pages/events/list
 *
 * 조립(composition) 레이어. 비즈니스 로직은 features/entities, UI는 widgets/components,
 * 페이지 전용 훅은 ./hooks/* 에 위임한다.
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { useQueryClient } from '@tanstack/react-query'
import { useNavigate, useSearchParams } from 'react-router-dom'

import { useEvents } from '@/entities/event/model'
import {
  useHeadsOfState,
  useTenureGroups,
} from '@/entities/government-position/model'
import { useEventFilters } from '@/features/event-filters/model'
import { useEventHierarchy } from '@/features/event-hierarchy/model'
import { VIEW_MODES, type ViewMode } from '@/features/event-list/lib'
import type { SortOption } from '@/features/event-list/lib/constants'
import { pathKeys } from '@/shared/router'
import { useBookmarks } from '@/shared/hooks/use-bookmarks.hook'
import { useRecentEvents } from '@/shared/hooks/use-recent-events.hook'
import { EventCompactList } from '@/widgets/event-list-compact/ui/event-compact-list'
import { EventTimeline } from '@/widgets/event-timeline/ui/event-timeline'
import { EventDetailPanel } from '@/widgets/event-list/ui/event-detail-panel'

import type {
  EventHierarchyNode,
  HistoricalEvent,
} from '../create/events.types'
import * as Layout from '../styles/layout.styles'
import * as PageStyles from '../styles/list-page.styles'

import { CatalogDetailDrawer } from './components/catalog-detail-drawer'
import { CatalogMainContent } from './components/catalog-main-content'
import { CatalogModals } from './components/catalog-modals'
import { CatalogToolbar } from './components/catalog-toolbar'
import { useCatalogReferenceData } from './hooks/use-catalog-reference-data'
import {
  useCatalogListNavigation,
  useCatalogShortcuts,
} from './hooks/use-catalog-keyboard'
import { useCatalogUrlSync } from './hooks/use-catalog-url-sync'
import { exportEventsAsJson } from './lib/export-events'

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
  const [shortcutHelpOpen, setShortcutHelpOpen] = useState(false)
  const searchInputRef = useRef<HTMLInputElement | null>(null)
  const [pageSize, setPageSize] = useState(20)

  // ===== 북마크 / 최근 본 =====
  const { bookmarks, toggleBookmark } = useBookmarks()
  const { recentEvents, addRecentEvent } = useRecentEvents()

  // ===== Entity: 사건 데이터 =====
  // useEvents는 React Query 무한 스크롤로 전환됨(a1b5b6f85). gov positions 동시 fetch는
  // 새 hook에서 빠짐 → useHeadsOfState/EventDetailPanel은 기본값 [] 사용.
  const { events, isLoading, hasMore, fetchMoreEvents } = useEvents({
    pageSize,
    countryId: countryId ?? undefined,
  })

  // ===== 참조 데이터 (카테고리·국가) =====
  const { dbCategories, countries, historicalCountries } =
    useCatalogReferenceData()

  // ===== Feature: 필터 =====
  const {
    selectedCategory,
    sortBy,
    sortDirection,
    selectedCentury,
    selectedCountry,
    selectedPositionType,
    showFlatView,
    setSelectedCategory,
    setKeyword,
    setSortBy,
    setSortDirection,
    setSelectedCentury,
    setSelectedCountry,
    setSelectedPositionType,
    setShowFlatView,
    availableCenturies,
    filteredEvents,
    sortedEvents,
    filterSummaryChips,
    hasActiveFilters,
    handleResetFilters,
  } = useEventFilters(events, dbCategories, countries, historicalCountries)

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

  const {
    eventHeadsOfState,
    expandedTenureGroups,
    toggleTenureGroupExpansion,
  } = useHeadsOfState(events, [], selectedPositionType)

  const tenureGroups = useTenureGroups(
    flattenedHierarchy,
    eventHeadsOfState,
    events,
  )

  // ===== UI 상태 =====
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    const v = searchParams.get('view')
    return v === VIEW_MODES.LIST ? VIEW_MODES.LIST : VIEW_MODES.TIMELINE
  })
  const [selectedEventId, setSelectedEventId] = useState<string | null>(
    searchParams.get('event'),
  )

  /** 키워드 디바운스 — 입력 자체는 즉시 반영(체감)하되 useEventFilters에 흘려보내는 값만 250ms로 묶음.
   * `isSearchPending`은 디바운스 idle 구간을 toolbar의 spinner로 노출 (UX: 적용됐는지 인지) */
  const [keywordInput, setKeywordInput] = useState(searchParams.get('q') ?? '')
  const [isSearchPending, setIsSearchPending] = useState(false)
  useEffect(() => {
    setIsSearchPending(true)
    const t = window.setTimeout(() => {
      setKeyword(keywordInput)
      setIsSearchPending(false)
    }, 250)
    return () => window.clearTimeout(t)
    // setKeyword는 useEventFilters 내부의 setter — 안정적
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [keywordInput])

  const [showCategoryModal, setShowCategoryModal] = useState(false)
  const [showCountryModal, setShowCountryModal] = useState(false)
  const [showPositionTypeModal, setShowPositionTypeModal] = useState(false)
  const [showSummaryModal, setShowSummaryModal] = useState(false)
  const [summaryEventId, setSummaryEventId] = useState<string | null>(null)

  // ===== 사건 선택 시 최근 본 목록에 추가 =====
  useEffect(() => {
    if (selectedEventId) {
      addRecentEvent(selectedEventId)
    }
  }, [selectedEventId, addRecentEvent])

  // ===== 모달/drawer 열린 동안 body 스크롤 잠금 =====
  // (drawer/모달은 portal 또는 fixed라 main에 inert를 거는 건 부작용이 큼 — body overflow만 잠금)
  useEffect(() => {
    const anyOpen =
      shortcutHelpOpen ||
      showSummaryModal ||
      showCategoryModal ||
      showCountryModal ||
      showPositionTypeModal
    if (!anyOpen) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [
    shortcutHelpOpen,
    showSummaryModal,
    showCategoryModal,
    showCountryModal,
    showPositionTypeModal,
  ])

  /** id → event 빠른 조회 (selectedEvent/selectedNode/summaryNode 검색 O(1)) */
  const eventByIdMap = useMemo(() => {
    const m = new Map<string, HistoricalEvent>()
    for (const e of events) m.set(e.id, e)
    return m
  }, [events])

  /** id → hierarchy node + 그것을 담은 root event 매핑 — 재귀 한 번 펼쳐 캐싱 */
  const nodeIndexMap = useMemo(() => {
    const m = new Map<
      string,
      { node: EventHierarchyNode; rootEvent: HistoricalEvent }
    >()
    const visit = (node: EventHierarchyNode, rootEvent: HistoricalEvent) => {
      m.set(node.id, { node, rootEvent })
      if (node.children) {
        for (const c of node.children) visit(c, rootEvent)
      }
    }
    for (const e of events) visit(e.hierarchy, e)
    return m
  }, [events])

  // ===== URL ↔ 상태 동기화 =====
  useCatalogUrlSync({
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
  const closeShortcutHelp = useCallback(() => setShortcutHelpOpen(false), [])
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
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget
    const scrollBottom =
      target.scrollHeight - target.scrollTop - target.clientHeight
    if (scrollBottom < 300 && hasMore && !isLoading) {
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

  const openSummary = useCallback((eventId: string) => {
    setSummaryEventId(eventId)
    setShowSummaryModal(true)
  }, [])

  // ===== 슬롯: 타임라인 / 카드 리스트 / 상세 패널 =====
  const timelineSlot = (
    <EventTimeline
      flattenedHierarchy={visibleFlattenedHierarchy}
      events={events}
      selectedEventId={selectedEventId}
      dbCategories={dbCategories}
      onSelectEvent={setSelectedEventId}
    />
  )

  const listSlot = (
    <EventCompactList
      isLoading={isLoading && events.length === 0}
      flattenedHierarchy={visibleFlattenedHierarchy}
      events={events}
      filteredEvents={filteredEvents}
      sortedEvents={sortedEvents}
      expandedEventIds={expandedEventIds}
      expandedTenureGroups={expandedTenureGroups}
      selectedEventId={selectedEventId}
      sortBy={sortBy}
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
      tenureGroups={tenureGroups}
      periodHeadsOfState={eventHeadsOfState.get('__periodHeads__') ?? []}
      dbCategories={dbCategories}
      totalCount={visibleFlattenedHierarchy.length}
      isLoadingMore={isLoading && events.length > 0}
      displayedCount={visibleFlattenedHierarchy.length}
      hasMoreData={hasMore}
      bookmarks={bookmarks}
      onToggleExpansion={toggleEventExpansion}
      onToggleTenureGroupExpansion={toggleTenureGroupExpansion}
      onSelectEvent={setSelectedEventId}
      onShowSummary={openSummary}
      onSortChange={(newSortBy: string) => {
        setSortBy(newSortBy as SortOption)
        if (newSortBy === 'recent' || newSortBy === 'duration') {
          setSortDirection('desc')
        }
      }}
      onSortDirectionToggle={() => {
        setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'))
      }}
      onResetFilters={handleResetAll}
      onToggleBookmark={toggleBookmark}
      onScroll={handleScroll}
      pageSize={pageSize}
      onPageSizeChange={handlePageSizeChange}
    />
  )

  const handleAfterDelete = useCallback(
    (deletedId: string) => {
      // 선택 해제 + React Query 캐시 invalidate (페이지 reload 회피)
      if (selectedEventId === deletedId) setSelectedEventId(null)
      queryClient.invalidateQueries({ queryKey: ['events'] })
    },
    [selectedEventId, queryClient],
  )

  const detailPanelSlot = (
    <EventDetailPanel
      isLoading={false}
      selectedEvent={selectedEvent}
      selectedNode={selectedNode}
      dbCategories={dbCategories}
      eventHeadsOfState={eventHeadsOfState}
      onSelectEvent={setSelectedEventId}
      onExpandEvent={(eventId) => {
        setExpandedEventIds((prev) => {
          const next = new Set(prev)
          next.add(eventId)
          return next
        })
      }}
      onShowSummary={openSummary}
      onAfterDelete={handleAfterDelete}
      // ── Discovery Hub용 데이터 (선택 없을 때만 사용)
      events={events}
      recentEventIds={recentEvents}
      bookmarkIds={bookmarks}
      filteredEvents={sortedEvents}
    />
  )

  // ===== 묶음 props (toolbar/modals) — 필드가 32/18개라 spread 패턴이 가장 안전 =====
  const toolbarProps = {
    searchInputRef,
    keywordInput,
    setKeywordInput,
    isSearchPending,
    selectedCategory,
    selectedCountry,
    selectedPositionType,
    selectedCentury,
    showFlatView,
    sortBy,
    sortDirection,
    dbCategories,
    availableCenturies,
    countries,
    historicalCountries,
    setShowCategoryModal,
    setShowCountryModal,
    setShowPositionTypeModal,
    toggleShowFlatView: () => setShowFlatView(!showFlatView),
    setSelectedCentury,
    setSortBy,
    setSortDirection,
    bookmarksOnly,
    toggleBookmarksOnly: () => setBookmarksOnly((v) => !v),
    bookmarksCount: bookmarks.size,
    onExportJson: () =>
      exportEventsAsJson(
        visibleFlattenedHierarchy.map(
          (it) =>
            eventByIdMap.get(it.node.id) ??
            nodeIndexMap.get(it.node.id)?.rootEvent ??
            null,
        ),
      ),
    onOpenShortcutHelp: () => setShortcutHelpOpen(true),
    onCreateEvent: () => navigate(pathKeys.events.create()),
    filterSummaryChips,
    activeFilterCount,
    handleResetAll,
  }

  const modalsProps = {
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
    showPositionTypeModal,
    setShowPositionTypeModal,
    selectedPositionType,
    setSelectedPositionType,
    shortcutHelpOpen,
    closeShortcutHelp,
    showSummaryModal,
    setShowSummaryModal,
    summaryNode,
  }

  const content = (
    <>
      {embed ? (
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
            <PageStyles.PageHeaderSubtitle>
              {countryId
                ? '선택한 국가에 연관된 역사적 사건들'
                : filtersOrSearchActive
                  ? `${events.length.toLocaleString()}건 중 ${visibleFlattenedHierarchy.length.toLocaleString()}건 표시`
                  : `등록된 ${events.length.toLocaleString()}건의 역사적 사건을 시간순으로 살펴봅니다`}
            </PageStyles.PageHeaderSubtitle>
          </PageStyles.PageHeaderTitleGroup>
        </PageStyles.PageHeader>
      )}

      <CatalogToolbar {...toolbarProps} />

      <Layout.CatalogSplit>
        <CatalogMainContent
          viewMode={viewMode}
          setViewMode={setViewMode}
          visibleCount={visibleFlattenedHierarchy.length}
          timelineSlot={timelineSlot}
          listSlot={listSlot}
        />
        <CatalogDetailDrawer
          open={!!selectedEventId}
          onClose={clearSelectedEvent}
          title={selectedEvent?.title ?? selectedNode?.title ?? null}
        >
          {detailPanelSlot}
        </CatalogDetailDrawer>
      </Layout.CatalogSplit>
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

      <CatalogModals {...modalsProps} />
    </>
  )
}

export default EventsCatalogPage
