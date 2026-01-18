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
import {
  type EventCategoryDto,
  getAllEventCategories,
} from '@/shared/api/event-categories'
import { pathKeys } from '@/shared/router'
import { CategorySummaryGrid } from '@/widgets/event-category-summary/ui'
import { FiltersPanel } from '@/widgets/event-filters-panel/ui'
import { EventCompactList } from '@/widgets/event-list-compact/ui'
import {
  CategoryModal,
  EventDetailPanel,
  SimpleSelectModal,
  TimelineView,
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

export const EventsCatalogPageRefactored: React.FC = () => {
  const navigate = useNavigate()

  // ===== Entity: Events Data =====
  const { events, personsWithGovPositions, isLoading } = useEvents()

  // ===== Entity: Categories Data =====
  const [dbCategories, setDbCategories] = useState<EventCategoryDto[]>([])

  useEffect(() => {
    getAllEventCategories()
      .then((categories) => {
        console.log('✅ 카테고리 목록 로드:', categories)
        setDbCategories(categories)
      })
      .catch((error) => {
        console.error('❌ 카테고리 로드 실패:', error)
        setDbCategories([])
      })
  }, [])

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
    setSelectedCategory,
    setKeyword,
    setSortBy,
    setSortDirection,
    setSelectedCentury,
    setSelectedCountry,
    setSelectedPositionType,
    setShowFlatView,
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
  } = useEventHierarchy(sortedEvents, events, showFlatView)

  // ===== Entity: Heads of State =====
  const {
    eventHeadsOfState,
    expandedTenureGroups,
    toggleTenureGroupExpansion,
  } = useHeadsOfState(events, personsWithGovPositions, selectedPositionType)

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
  const [summaryViewMode, setSummaryViewMode] = useState<SummaryViewMode>(
    SUMMARY_VIEW_MODES.TIMELINE,
  )

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

  return (
    <Layout.PageScene>
      <Layout.PageWrapper>
        <Layout.PageTopBar>
          <Layout.PageTopTitle>
            <h1>역사적 사건</h1>
            <p>시대별 주요 사건과 계층적 관계를 탐색합니다</p>
          </Layout.PageTopTitle>
          <Layout.CreateEventButton
            onClick={() => navigate(pathKeys.events.create())}
          >
            <FiPlus size={16} />새 사건 등록
          </Layout.CreateEventButton>
        </Layout.PageTopBar>

        {/* ===== Widget: Category Summary Grid ===== */}
        <CategorySummaryGrid
          isLoading={isLoading}
          dbCategories={dbCategories}
          events={events}
        />

        <Layout.CatalogSplit>
          {/* ===== Widget: Filters Panel ===== */}
          <FiltersPanel
            keyword={keyword}
            selectedCategory={selectedCategory}
            selectedCountry={selectedCountry}
            selectedPositionType={selectedPositionType}
            selectedCentury={selectedCentury}
            showFlatView={showFlatView}
            hasActiveFilters={hasActiveFilters}
            isLoading={isLoading}
            dbCategories={dbCategories}
            availableCenturies={availableCenturies}
            events={events}
            onKeywordChange={setKeyword}
            onShowCategoryModal={() => setShowCategoryModal(true)}
            onShowCountryModal={() => setShowCountryModal(true)}
            onShowPositionTypeModal={() => setShowPositionTypeModal(true)}
            onToggleFlatView={() => setShowFlatView(!showFlatView)}
            onResetFilters={handleResetFilters}
            onSelectCentury={setSelectedCentury}
          />

          {/* ===== Widget: Event Compact List ===== */}
          <EventCompactList
            isLoading={isLoading}
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
            dbCategories={dbCategories}
            onToggleExpansion={toggleEventExpansion}
            onToggleTenureGroupExpansion={toggleTenureGroupExpansion}
            onSelectEvent={setSelectedEventId}
            onShowSummary={(eventId) => {
              setSummaryEventId(eventId)
              setShowSummaryModal(true)
            }}
            onSortChange={setSortBy}
            onSortDirectionToggle={() =>
              setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'))
            }
            onResetFilters={handleResetFilters}
          />

          {/* ===== Widget: Event Detail Panel ===== */}
          <EventDetailPanel
            isLoading={isLoading}
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
        </Layout.CatalogSplit>
      </Layout.PageWrapper>

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
      <SimpleSelectModal
        isOpen={showCountryModal}
        onClose={() => setShowCountryModal(false)}
        title="국가 선택"
        selectedValue={selectedCountry}
        options={availableCountries.map((country) => ({
          value: country,
          label: country,
        }))}
        onSelect={(value) => setSelectedCountry(value)}
        allLabel="전체 국가"
        allDescription="모든 참전국/관련국"
        Icon={FiGlobe}
      />

      {/* ===== Modal: Position Type Selection ===== */}
      <SimpleSelectModal
        isOpen={showPositionTypeModal}
        onClose={() => setShowPositionTypeModal(false)}
        title="직업 선택"
        selectedValue={selectedPositionType}
        options={MOCK_POSITION_TYPES}
        onSelect={(value) => setSelectedPositionType(value)}
        allLabel="전체 직업"
        allDescription="모든 직책의 인물"
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
                  <Modal.SummaryTab
                    $active={summaryViewMode === SUMMARY_VIEW_MODES.TIMELINE}
                    onClick={() => setSummaryViewMode('timeline')}
                  >
                    <FiClock size={16} />
                    타임라인
                  </Modal.SummaryTab>
                  <Modal.SummaryTab
                    $active={summaryViewMode === SUMMARY_VIEW_MODES.TREE}
                    onClick={() => setSummaryViewMode('tree')}
                  >
                    <FiGitBranch size={16} />
                    계층 구조
                  </Modal.SummaryTab>
                </Modal.SummaryTabBar>

                <Modal.SummaryContent>
                  {summaryViewMode === SUMMARY_VIEW_MODES.TIMELINE ? (
                    <TimelineView node={summaryNode} />
                  ) : (
                    <TreeView node={summaryNode} />
                  )}
                </Modal.SummaryContent>
              </motion.div>
            </Modal.SummaryModal>
          </>,
          document.body,
        )}
    </Layout.PageScene>
  )
}

export default EventsCatalogPageRefactored
