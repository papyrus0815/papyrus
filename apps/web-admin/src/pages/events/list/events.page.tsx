/**
 * Events Catalog Page
 * FSD: pages/events/list
 *
 * 조립(composition) 레이어. 비즈니스 로직은 features/entities, UI는 widgets/components,
 * 페이지 전용 훅은 ./hooks/* 에 위임한다.
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { useNavigate, useSearchParams } from 'react-router-dom'

import { useEvents } from '@/entities/event/model'
import {
  useHeadsOfState,
  useTenureGroups,
} from '@/entities/government-position/model'
import { useEventFilters } from '@/features/event-filters/model'
import { useEventHierarchy } from '@/features/event-hierarchy/model'
import {
  SUMMARY_VIEW_MODES,
  type SummaryViewMode,
  VIEW_MODES,
  type ViewMode,
} from '@/features/event-list/lib'
import type { SortOption } from '@/features/event-list/lib/constants'
import { useBookmarks } from '@/shared/hooks/use-bookmarks.hook'
import { useRecentEvents } from '@/shared/hooks/use-recent-events.hook'
import { Badge } from '@/shared/ui/badge/badge'
import { EventCompactList } from '@/widgets/event-list-compact/ui/event-compact-list'
import { EventTimeline } from '@/widgets/event-timeline/ui/event-timeline'
import { EventDetailPanel } from '@/widgets/event-list/ui/event-detail-panel'

import type {
  EventHierarchyNode,
  HistoricalEvent,
} from '../create/events.types'
import * as Layout from '../styles/layout.styles'
import * as PageStyles from '../styles/list-page.styles'

import { CatalogMainContent } from './components/catalog-main-content'
import { CatalogModals } from './components/catalog-modals'
import { CatalogToolbar } from './components/catalog-toolbar'
import { DeletedEventsListPanel } from './components/deleted-events-list'
import { useCatalogReferenceData } from './hooks/use-catalog-reference-data'
import {
  useCatalogListNavigation,
  useCatalogShortcuts,
} from './hooks/use-catalog-keyboard'
import { useCatalogUrlSync } from './hooks/use-catalog-url-sync'
import { useDeletedEvents } from './hooks/use-deleted-events'
import { exportEvents } from './lib/export-events'

export interface EventsCatalogPageProps {
  /** 국가(현대/역사적) ID로 연관 사건만 표시. 미전달 시 전체 사건 */
  countryId?: string | null
  /** 대시보드 등에 임베드 시 상단 타이틀/여백 축소 */
  embed?: boolean
}

const embedWrapperStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  width: '100%',
  flex: 1,
  minHeight: 0,
  overflow: 'hidden',
  padding: '0 16px',
}

export const EventsCatalogPage: React.FC<EventsCatalogPageProps> = ({
  countryId,
  embed = false,
}) => {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()

  // ===== 탭 / 검색 / 페이지 상태 =====
  const [activeTab, setActiveTab] = useState<'active' | 'deleted'>('active')
  const [bookmarksOnly, setBookmarksOnly] = useState(
    searchParams.get('bookmarks') === '1',
  )
  const [shortcutHelpOpen, setShortcutHelpOpen] = useState(false)
  const searchInputRef = useRef<HTMLInputElement | null>(null)
  const [pageSize, setPageSize] = useState(20)

  // ===== 북마크 / 최근 본 =====
  const { bookmarks, toggleBookmark } = useBookmarks()
  const { addRecentEvent } = useRecentEvents()

  // ===== Entity: 사건 데이터 =====
  const {
    events,
    personsWithGovPositions,
    isLoading,
    hasMore,
    fetchMoreEvents,
    resetAndFetch,
  } = useEvents(pageSize, countryId)

  // ===== 참조 데이터 (카테고리·국가) + 삭제된 사건 =====
  const { dbCategories, countries, historicalCountries } =
    useCatalogReferenceData()
  const { deletedEvents, deletedCount } = useDeletedEvents(activeTab)

  // ===== Feature: 필터 =====
  const {
    selectedCategory,
    keyword,
    sortBy,
    sortDirection,
    selectedCentury,
    selectedCountry,
    selectedPositionType,
    showFlatView,
    showGlobalHeadsOfState,
    setSelectedCategory,
    setKeyword,
    setSortBy,
    setSortDirection,
    setSelectedCentury,
    setSelectedCountry,
    setSelectedPositionType,
    setShowFlatView,
    setShowGlobalHeadsOfState,
    availableCenturies,
    filteredEvents,
    sortedEvents,
    filterSummaryChips,
    hasActiveFilters,
    handleResetFilters,
  } = useEventFilters(events, dbCategories)

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
  } = useHeadsOfState(
    events,
    personsWithGovPositions,
    selectedPositionType,
    showGlobalHeadsOfState,
  )

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

  /** 키워드 디바운스 — 입력 자체는 즉시 반영(체감)하되 useEventFilters에 흘려보내는 값만 250ms로 묶음 */
  const [keywordInput, setKeywordInput] = useState(searchParams.get('q') ?? '')
  useEffect(() => {
    const t = window.setTimeout(() => {
      setKeyword(keywordInput)
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
  // SummaryViewMode는 현재 TREE만 사용 중 — 향후 확장 대비 상수 보존
  const [, /* summaryViewMode */] = useState<SummaryViewMode>(
    SUMMARY_VIEW_MODES.TREE,
  )

  // ===== 사건 선택 시 최근 본 목록에 추가 =====
  useEffect(() => {
    if (selectedEventId) {
      addRecentEvent(selectedEventId)
    }
  }, [selectedEventId, addRecentEvent])

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
    const visit = (
      node: EventHierarchyNode,
      rootEvent: HistoricalEvent,
    ) => {
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
  const handlePageSizeChange = (newSize: number) => {
    setPageSize(newSize)
    resetAndFetch(newSize)
  }

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
      onShowSummary={(eventId) => {
        setSummaryEventId(eventId)
        setShowSummaryModal(true)
      }}
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

  const detailPanelSlot = (
    <EventDetailPanel
      isLoading={false}
      selectedEvent={selectedEvent}
      selectedNode={selectedNode}
      dbCategories={dbCategories}
      personsWithGovPositions={personsWithGovPositions}
      eventHeadsOfState={eventHeadsOfState}
      onSelectEvent={setSelectedEventId}
      onExpandEvent={(eventId) => {
        setExpandedEventIds((prev) => {
          const next = new Set(prev)
          next.add(eventId)
          return next
        })
      }}
      onShowSummary={(eventId) => {
        setSummaryEventId(eventId)
        setShowSummaryModal(true)
      }}
    />
  )

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
                : `등록된 ${events.length.toLocaleString()}건의 역사적 사건을 시간순으로 살펴봅니다`}
            </PageStyles.PageHeaderSubtitle>
          </PageStyles.PageHeaderTitleGroup>
        </PageStyles.PageHeader>
      )}

      <CatalogToolbar
        searchInputRef={searchInputRef}
        keywordInput={keywordInput}
        setKeywordInput={setKeywordInput}
        selectedCategory={selectedCategory}
        selectedCountry={selectedCountry}
        selectedPositionType={selectedPositionType}
        selectedCentury={selectedCentury}
        showFlatView={showFlatView}
        showGlobalHeadsOfState={showGlobalHeadsOfState}
        sortBy={sortBy}
        sortDirection={sortDirection}
        dbCategories={dbCategories}
        availableCenturies={availableCenturies}
        countries={countries}
        historicalCountries={historicalCountries}
        setShowCategoryModal={setShowCategoryModal}
        setShowCountryModal={setShowCountryModal}
        setShowPositionTypeModal={setShowPositionTypeModal}
        toggleShowFlatView={() => setShowFlatView(!showFlatView)}
        toggleShowGlobalHeadsOfState={() =>
          setShowGlobalHeadsOfState((prev) => !prev)
        }
        setSelectedCentury={setSelectedCentury}
        setSortBy={setSortBy}
        setSortDirection={setSortDirection}
        bookmarksOnly={bookmarksOnly}
        toggleBookmarksOnly={() => setBookmarksOnly((v) => !v)}
        bookmarksCount={bookmarks.size}
        onExportJson={() =>
          exportEvents(
            visibleFlattenedHierarchy.map(
              (it) =>
                eventByIdMap.get(it.node.id) ??
                nodeIndexMap.get(it.node.id)?.rootEvent ??
                null,
            ),
            'json',
          )
        }
        onOpenShortcutHelp={() => setShortcutHelpOpen(true)}
        filterSummaryChips={filterSummaryChips}
        activeFilterCount={activeFilterCount}
        handleResetAll={handleResetAll}
      />

      {/* 탭 네비게이션 */}
      <PageStyles.TabBar role="tablist" aria-label="사건 카탈로그 탭">
        <PageStyles.TabButton
          type="button"
          role="tab"
          aria-selected={activeTab === 'active'}
          $active={activeTab === 'active'}
          $tone="primary"
          onClick={() => setActiveTab('active')}
        >
          전체 사건
        </PageStyles.TabButton>
        <PageStyles.TabButton
          type="button"
          role="tab"
          aria-selected={activeTab === 'deleted'}
          $active={activeTab === 'deleted'}
          $tone="danger"
          onClick={() => setActiveTab('deleted')}
        >
          삭제된 사건
          {deletedCount > 0 && <Badge tone="danger">{deletedCount}</Badge>}
        </PageStyles.TabButton>
      </PageStyles.TabBar>

      <Layout.CatalogSplit>
        {activeTab === 'active' ? (
          <CatalogMainContent
            viewMode={viewMode}
            setViewMode={setViewMode}
            visibleCount={visibleFlattenedHierarchy.length}
            timelineSlot={timelineSlot}
            listSlot={listSlot}
            selectedEventId={selectedEventId}
            clearSelectedEvent={clearSelectedEvent}
            detailPanelSlot={detailPanelSlot}
          />
        ) : (
          <DeletedEventsListPanel deletedEvents={deletedEvents} />
        )}
      </Layout.CatalogSplit>
    </>
  )

  return (
    <>
      {embed ? (
        <div style={embedWrapperStyle}>{content}</div>
      ) : (
        <Layout.PageScene>
          <Layout.PageWrapper>{content}</Layout.PageWrapper>
        </Layout.PageScene>
      )}

      <CatalogModals
        showCategoryModal={showCategoryModal}
        setShowCategoryModal={setShowCategoryModal}
        dbCategories={dbCategories}
        selectedCategory={selectedCategory}
        setSelectedCategory={setSelectedCategory}
        showCountryModal={showCountryModal}
        setShowCountryModal={setShowCountryModal}
        countries={countries}
        historicalCountries={historicalCountries}
        selectedCountry={selectedCountry}
        setSelectedCountry={setSelectedCountry}
        showPositionTypeModal={showPositionTypeModal}
        setShowPositionTypeModal={setShowPositionTypeModal}
        selectedPositionType={selectedPositionType}
        setSelectedPositionType={setSelectedPositionType}
        shortcutHelpOpen={shortcutHelpOpen}
        closeShortcutHelp={closeShortcutHelp}
        showSummaryModal={showSummaryModal}
        setShowSummaryModal={setShowSummaryModal}
        summaryNode={summaryNode}
      />
    </>
  )
}

export default EventsCatalogPage
