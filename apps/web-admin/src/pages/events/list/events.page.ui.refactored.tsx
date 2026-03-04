/**
 * Events Catalog Page - FSD Refactored
 * FSD: pages/events/list
 *
 * 이 페이지는 조립(composition) 레이어로, 비즈니스 로직은 features/entities에,
 * UI 컴포넌트는 widgets에 위임합니다.
 */
import React, { useEffect, useMemo, useState } from 'react'

import { createPortal } from 'react-dom'

import { motion } from 'framer-motion'
import {
  FiClock,
  FiGitBranch,
  FiGlobe,
  FiPlus,
  FiUsers,
  FiX,
} from 'react-icons/fi'
import { useNavigate } from 'react-router-dom'

import { useEvents } from '@/entities/event/model'
import {
  useHeadsOfState,
  useTenureGroups,
} from '@/entities/government-position/model'
import { useEventFilters } from '@/features/event-filters/model'
import { useEventHierarchy } from '@/features/event-hierarchy/model'
import {
  FILTER_ALL,
  SUMMARY_VIEW_MODES,
  type SummaryViewMode,
  VIEW_MODES,
  type ViewMode,
} from '@/features/event-list/lib'
import { getAllCountries } from '@/shared/api/countries'
import type { CountryResponseDto } from '@/shared/api/countries'
import {
  type EventCategoryDto,
  getAllEventCategories,
} from '@/shared/api/event-categories'
import { getDeletedEvents } from '@/shared/api/events'
import { getAllHistoricalCountries } from '@/shared/api/historical-countries'
import type { HistoricalCountryResponseDto } from '@/shared/api/historical-countries'
import { useBookmarks } from '@/shared/hooks/use-bookmarks.hook'
import { useRecentEvents } from '@/shared/hooks/use-recent-events.hook'
import { pathKeys } from '@/shared/router'
import { AdvancedCountrySelectModal } from '@/shared/ui/advanced-country-select-modal/AdvancedCountrySelectModal'
import { FiltersPanel } from '@/widgets/event-filters-panel/ui'
import { EventCompactList } from '@/widgets/event-list-compact/ui'
import {
  CategoryModal,
  EventDetailPanel,
  SimpleSelectModal,
  TreeView,
} from '@/widgets/event-list/ui'

import type {
  EventHierarchyNode,
  HistoricalEvent,
} from '../create/events.types'
import * as Layout from '../styles/layout.styles'
import * as Modal from '../styles/modal.styles'
import { formatDateRange } from '../utils/events.utils'
import { MOCK_POSITION_TYPES } from './mock-government-positions'

export interface EventsCatalogPageRefactoredProps {
  /** 국가(현대/역사적) ID로 연관 사건만 표시. 미전달 시 전체 사건 */
  countryId?: string | null
  /** 대시보드 등에 임베드 시 상단 타이틀/여백 축소 */
  embed?: boolean
}

export const EventsCatalogPageRefactored: React.FC<
  EventsCatalogPageRefactoredProps
> = ({ countryId, embed = false }) => {
  const navigate = useNavigate()

  // ===== Tab State =====
  const [activeTab, setActiveTab] = useState<'active' | 'deleted'>('active')
  const [deletedEvents, setDeletedEvents] = useState<HistoricalEvent[]>([])

  // ===== Pagination State (useEvents보다 먼저 선언) =====
  const [pageSize, setPageSize] = useState(20)

  // ===== Bookmarks & Recent =====
  const { bookmarks, toggleBookmark } = useBookmarks()
  const { addRecentEvent } = useRecentEvents()

  // ===== Entity: Events Data (countryId 있으면 해당 국가 연관 사건만) =====
  const {
    events,
    personsWithGovPositions,
    isLoading,
    hasMore,
    fetchMoreEvents,
    resetAndFetch,
  } = useEvents(pageSize, countryId)

  // ===== Entity: Categories Data =====
  const [dbCategories, setDbCategories] = useState<EventCategoryDto[]>([])
  const [countries, setCountries] = useState<CountryResponseDto[]>([])
  const [historicalCountries, setHistoricalCountries] = useState<
    HistoricalCountryResponseDto[]
  >([])

  useEffect(() => {
    Promise.all([
      getAllEventCategories(),
      getAllCountries(),
      getAllHistoricalCountries(),
    ])
      .then(([categories, countriesData, historicalCountriesData]) => {
        setDbCategories(categories)
        setCountries(countriesData)
        setHistoricalCountries(historicalCountriesData)
      })
      .catch(() => {
        setDbCategories([])
        setCountries([])
        setHistoricalCountries([])
      })
  }, [])

  // 삭제된 사건 로드
  useEffect(() => {
    if (activeTab === 'deleted') {
      getDeletedEvents()
        .then((events) => {
          // EventResponseDto를 HistoricalEvent로 변환 필요
          setDeletedEvents(events as any)
        })
        .catch(() => setDeletedEvents([]))
    }
  }, [activeTab])

  // ===== Feature: Event Filters =====
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
    availableCountries,
    availableCenturies,
    filteredEvents,
    sortedEvents,
    filterSummaryChips,
    hasActiveFilters,
    handleResetFilters,
  } = useEventFilters(events, dbCategories)

  // ===== Feature: Event Hierarchy =====
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

  // ===== Entity: Heads of State =====
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

  // ===== Feature: Tenure Groups =====
  const tenureGroups = useTenureGroups(
    flattenedHierarchy,
    eventHeadsOfState,
    events,
  )

  // ===== UI State =====
  const [viewMode, setViewMode] = useState<ViewMode>(VIEW_MODES.GRID)
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null)
  const [showCategoryModal, setShowCategoryModal] = useState(false)
  const [showCountryModal, setShowCountryModal] = useState(false)
  const [showPositionTypeModal, setShowPositionTypeModal] = useState(false)
  const [showSummaryModal, setShowSummaryModal] = useState(false)
  const [summaryEventId, setSummaryEventId] = useState<string | null>(null)
  const [summaryViewMode] = useState<SummaryViewMode>(
    SUMMARY_VIEW_MODES.TREE,
  )

  // ===== 사건 선택 시 최근 본 목록에 추가 =====
  useEffect(() => {
    if (selectedEventId) {
      addRecentEvent(selectedEventId)
    }
  }, [selectedEventId, addRecentEvent])

  // ===== Pagination: 페이지 크기 변경 핸들러 =====
  const handlePageSizeChange = (newSize: number) => {
    setPageSize(newSize)
    resetAndFetch(newSize)
  }

  // ===== 키보드 네비게이션 =====
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!flattenedHierarchy.length) return

      const currentIndex = flattenedHierarchy.findIndex(
        (item) => item.node.id === selectedEventId,
      )

      let newIndex = currentIndex

      if (e.key === 'ArrowDown') {
        e.preventDefault()
        if (currentIndex < flattenedHierarchy.length - 1) {
          newIndex = currentIndex + 1
        } else if (currentIndex === -1 && flattenedHierarchy.length > 0) {
          newIndex = 0
        }
      } else if (e.key === 'ArrowUp' && currentIndex > 0) {
        e.preventDefault()
        newIndex = currentIndex - 1
      } else if (e.key === 'Enter' && selectedEventId) {
        e.preventDefault()
        navigate(pathKeys.events.detail(selectedEventId))
        return
      } else {
        return
      }

      if (newIndex !== currentIndex && newIndex !== -1) {
        const newId = flattenedHierarchy[newIndex].node.id
        setSelectedEventId(newId)

        // 선택된 카드로 스크롤
        setTimeout(() => {
          const element = document.querySelector(`[data-event-id="${newId}"]`)
          if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' })
          }
        }, 50)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [flattenedHierarchy, selectedEventId, navigate])

  // ===== Pagination: 스크롤 감지 (서버 페이징) =====
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget
    const scrollBottom =
      target.scrollHeight - target.scrollTop - target.clientHeight

    // 하단 300px 이내에 도달하고, 더 불러올 데이터가 있으면 서버에서 로드
    if (scrollBottom < 300 && hasMore && !isLoading) {
      fetchMoreEvents()
    }
  }

  // ===== 선택된 이벤트 정보 =====
  const selectedEvent = useMemo(() => {
    if (!selectedEventId) return null

    // 먼저 events에서 직접 찾기
    const directEvent = events.find((event) => event.id === selectedEventId)
    if (directEvent) return directEvent

    // hierarchy에서 찾기
    const findInHierarchy = (
      node: EventHierarchyNode,
      parentEvent: HistoricalEvent,
    ): HistoricalEvent | null => {
      if (node.id === selectedEventId) return parentEvent
      if (node.children) {
        for (const child of node.children) {
          const found = findInHierarchy(child, parentEvent)
          if (found) return found
        }
      }
      return null
    }

    for (const event of events) {
      const found = findInHierarchy(event.hierarchy, event)
      if (found) return found
    }

    return null
  }, [selectedEventId, events])

  // ===== 선택된 노드 정보 =====
  const selectedNode = useMemo(() => {
    if (!selectedEventId) return null

    const findNode = (node: EventHierarchyNode): EventHierarchyNode | null => {
      if (node.id === selectedEventId) return node
      if (node.children) {
        for (const child of node.children) {
          const found = findNode(child)
          if (found) return found
        }
      }
      return null
    }

    for (const event of events) {
      const found = findNode(event.hierarchy)
      if (found) return found
    }

    return null
  }, [selectedEventId, events])

  // ===== 요약 노드 정보 =====
  const summaryNode = useMemo(() => {
    if (!summaryEventId) return null

    const findNode = (node: EventHierarchyNode): EventHierarchyNode | null => {
      if (node.id === summaryEventId) return node
      if (node.children) {
        for (const child of node.children) {
          const found = findNode(child)
          if (found) return found
        }
      }
      return null
    }

    for (const event of events) {
      const found = findNode(event.hierarchy)
      if (found) return found
    }

    return null
  }, [summaryEventId, events])

  const content = (
    <>
      {embed && (
        <div
          style={{
            padding: '12px 16px 8px',
            fontSize: 15,
            fontWeight: 700,
            color: '#0f172a',
          }}
        >
          연대표
          {countryId && (
            <span style={{ fontWeight: 500, color: '#64748b', marginLeft: 8 }}>
              · 선택한 국가에 연관된 사건
            </span>
          )}
        </div>
      )}
      {/* ===== 상단 필터 바 ===== */}
      <Layout.TopFilterBar>
          <FiltersPanel
            keyword={keyword}
            selectedCategory={selectedCategory}
            selectedCountry={selectedCountry}
            selectedPositionType={selectedPositionType}
            selectedCentury={selectedCentury}
            showFlatView={showFlatView}
            showGlobalHeadsOfState={showGlobalHeadsOfState}
            hasActiveFilters={hasActiveFilters}
            isLoading={isLoading}
            sortBy={sortBy}
            sortDirection={sortDirection}
            dbCategories={dbCategories}
            availableCenturies={availableCenturies}
            events={events}
            countries={countries}
            historicalCountries={historicalCountries}
            onKeywordChange={setKeyword}
            onShowCategoryModal={() => setShowCategoryModal(true)}
            onShowCountryModal={() => setShowCountryModal(true)}
            onShowPositionTypeModal={() => setShowPositionTypeModal(true)}
            onToggleFlatView={() => setShowFlatView(!showFlatView)}
            onToggleShowGlobalHeadsOfState={() =>
              setShowGlobalHeadsOfState((prev) => !prev)
            }
            onResetFilters={handleResetFilters}
            onSelectCentury={setSelectedCentury}
            onSortChange={(newSortBy) => {
              setSortBy(newSortBy)
              if (newSortBy === 'recent' || newSortBy === 'duration') {
                setSortDirection('desc')
              }
            }}
            onSortDirectionToggle={() => {
              setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'))
            }}
          />
          <Layout.CreateEventButton
            onClick={() => navigate(pathKeys.events.create())}
          >
            <FiPlus size={16} />새 사건 등록
          </Layout.CreateEventButton>
        </Layout.TopFilterBar>

        {/* 탭 네비게이션 */}
        <div
          style={{
            display: 'flex',
            gap: '8px',
            padding: '12px 16px',
            borderBottom: '1px solid #e2e8f0',
            background: '#ffffff',
          }}
        >
          <button
            onClick={() => setActiveTab('active')}
            style={{
              padding: '8px 16px',
              border: 'none',
              borderBottom:
                activeTab === 'active'
                  ? '2px solid #6366f1'
                  : '2px solid transparent',
              background: 'transparent',
              color: activeTab === 'active' ? '#6366f1' : '#64748b',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
          >
            전체 사건
          </button>
          <button
            onClick={() => {
              setActiveTab('deleted')
              getDeletedEvents().then(setDeletedEvents).catch(() => {})
            }}
            style={{
              padding: '8px 16px',
              border: 'none',
              borderBottom:
                activeTab === 'deleted'
                  ? '2px solid #ef4444'
                  : '2px solid transparent',
              background: 'transparent',
              color: activeTab === 'deleted' ? '#ef4444' : '#64748b',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
          >
            삭제된 사건 ({deletedEvents.length})
          </button>
        </div>

        <Layout.CatalogSplit>
          {activeTab === 'active' ? (
            <>
              {/* ===== Widget: Event Compact List ===== */}
              <EventCompactList
                isLoading={isLoading && events.length === 0}
                flattenedHierarchy={flattenedHierarchy}
                events={events}
                filteredEvents={filteredEvents}
                sortedEvents={sortedEvents}
                expandedEventIds={expandedEventIds}
                expandedTenureGroups={expandedTenureGroups}
                selectedEventId={selectedEventId}
                sortBy={sortBy}
                sortDirection={sortDirection}
                hasActiveFilters={hasActiveFilters}
                tenureGroups={tenureGroups}
                periodHeadsOfState={
                  eventHeadsOfState.get('__periodHeads__') ?? []
                }
                dbCategories={dbCategories}
                totalCount={flattenedHierarchy.length}
                isLoadingMore={isLoading && events.length > 0}
                displayedCount={flattenedHierarchy.length}
                hasMoreData={hasMore}
                bookmarks={bookmarks}
                onToggleExpansion={toggleEventExpansion}
                onToggleTenureGroupExpansion={toggleTenureGroupExpansion}
                onSelectEvent={setSelectedEventId}
                onShowSummary={(eventId) => {
                  setSummaryEventId(eventId)
                  setShowSummaryModal(true)
                }}
                onSortChange={(newSortBy) => {
                  setSortBy(newSortBy)
                  if (newSortBy === 'recent' || newSortBy === 'duration') {
                    setSortDirection('desc')
                  }
                }}
                onSortDirectionToggle={() => {
                  setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'))
                }}
                onResetFilters={handleResetFilters}
                onToggleBookmark={toggleBookmark}
                onScroll={handleScroll}
                pageSize={pageSize}
                onPageSizeChange={handlePageSizeChange}
              />

              {/* ===== Widget: Event Detail Panel ===== */}
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
            </>
          ) : (
            <div>삭제된 사건 목록</div>
          )}
        </Layout.CatalogSplit>
    </>
  )

  const embedWrapperStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    width: '100%',
    flex: 1,
    minHeight: 0,
    overflow: 'hidden',
    padding: '0 16px',
  }

  return (
    <>
      {embed ? (
        <div style={embedWrapperStyle}>{content}</div>
      ) : (
        <Layout.PageScene>
          <Layout.PageWrapper>{content}</Layout.PageWrapper>
        </Layout.PageScene>
      )}

      {/* ===== Modal: Category Selection ===== */}
      <CategoryModal
        isOpen={showCategoryModal}
        onClose={() => setShowCategoryModal(false)}
        dbCategories={dbCategories}
        selectedCategory={selectedCategory}
        onSelect={(categoryId) => {
          setSelectedCategory(categoryId)
        }}
      />

      {/* ===== Modal: Country Selection ===== */}
      <AdvancedCountrySelectModal
        isOpen={showCountryModal}
        onClose={() => setShowCountryModal(false)}
        onSelect={(country) => {
          if (country.id === FILTER_ALL) {
            setSelectedCountry(FILTER_ALL)
          } else {
            setSelectedCountry(country.id)
          }
          setShowCountryModal(false)
        }}
        modernCountries={[
          { id: FILTER_ALL, name: '전체 국가', flagEmoji: '🌍' } as any,
          ...countries,
        ]}
        historicalCountries={historicalCountries}
        title="국가 필터"
        selectedCountryIds={
          selectedCountry === FILTER_ALL ? [] : [selectedCountry as string]
        }
        multiSelect={false}
      />

      {/* ===== Modal: Position Type Selection ===== */}
      <SimpleSelectModal
        isOpen={showPositionTypeModal}
        onClose={() => setShowPositionTypeModal(false)}
        title="역대 수반 직책"
        selectedValue={selectedPositionType}
        options={MOCK_POSITION_TYPES}
        onSelect={(value) => setSelectedPositionType(value)}
        allLabel="전체 직책"
        allDescription="모든 역대 수반"
        Icon={FiUsers}
      />

      {/* ===== Modal: Event Summary ===== */}
      {showSummaryModal &&
        summaryNode &&
        createPortal(
          <>
            <Modal.ModalOverlay
              as={motion.div}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              onClick={() => setShowSummaryModal(false)}
            />
            <Modal.SummaryModal>
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.2 }}
                style={{
                  width: '100%',
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                }}
              >
                <Modal.ModalHeader>
                  <div>
                    <Modal.ModalTitle>{summaryNode.title}</Modal.ModalTitle>
                    <Modal.SummarySubtitle>
                      {formatDateRange(
                        summaryNode.period.start,
                        summaryNode.period.end,
                      )}
                    </Modal.SummarySubtitle>
                  </div>
                  <Modal.ModalClose onClick={() => setShowSummaryModal(false)}>
                    <FiX size={20} />
                  </Modal.ModalClose>
                </Modal.ModalHeader>

                <Modal.SummaryTabBar>
                  <Modal.SummaryTab $active>
                    <FiGitBranch size={16} />
                    계층 구조
                  </Modal.SummaryTab>
                </Modal.SummaryTabBar>

                <Modal.SummaryContent>
                  <TreeView node={summaryNode} />
                </Modal.SummaryContent>
              </motion.div>
            </Modal.SummaryModal>
          </>,
          document.body,
        )}
    </>
  )
}

export default EventsCatalogPageRefactored
