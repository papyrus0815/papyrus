/**
 * 이벤트 목록 섹션 (중앙 패널)
 * FSD: widgets/event-list/ui
 *
 * 매우 큰 컴포넌트 (500줄) - 향후 더 분리 필요
 * TODO: EventCard, TenureGroupHeader 등으로 더 분리
 */
import React from 'react'

import {
  FiArrowDown,
  FiArrowUp,
  FiChevronDown,
  FiChevronRight,
  FiFilter,
  FiGitBranch,
  FiPlus,
  FiUserCheck,
  FiX,
} from 'react-icons/fi'
import { useNavigate } from 'react-router-dom'

import { getCategoryName } from '@/features/event-list/lib'
import type {
  EventHierarchyNode,
  HistoricalEvent,
} from '@/pages/events/create/events.types'
import * as List from '@/pages/events/styles/list.styles'
import * as Modal from '@/pages/events/styles/modal.styles'
import * as Skeleton from '@/pages/events/styles/skeleton.styles'
import type { EventCategoryDto } from '@/shared/api/event-categories'
import { pathKeys } from '@/shared/router'

type SortOption = 'recent' | 'duration'

interface EventListSectionProps {
  // 데이터
  events: HistoricalEvent[]
  dbCategories: EventCategoryDto[]

  // 필터된/정렬된 데이터
  filteredEvents: HistoricalEvent[]
  flattenedHierarchy: Array<{
    node: EventHierarchyNode
    depth: number
    parentEvent: HistoricalEvent | null
  }>
  tenureGroups: any[]

  // 정렬
  sortBy: SortOption
  setSortBy: (value: SortOption) => void
  sortDirection: 'asc' | 'desc'
  setSortDirection: (value: 'asc' | 'desc') => void

  // 확장 상태
  expandedEventIds: Set<string>
  toggleEventExpansion: (id: string) => void
  expandedTenureGroups: Set<string>
  toggleTenureGroupExpansion: (key: string) => void

  // 선택
  selectedEventId: string | null
  setSelectedEventId: (id: string | null) => void

  // 모달
  setSummaryEventId: (id: string) => void
  setShowSummaryModal: (show: boolean) => void

  // 필터
  hasActiveFilters: boolean
  handleResetFilters: () => void

  // 로딩
  isLoading: boolean
}

export const EventListSection: React.FC<EventListSectionProps> = ({
  events,
  dbCategories,
  filteredEvents,
  flattenedHierarchy,
  tenureGroups,
  sortBy,
  setSortBy,
  sortDirection,
  setSortDirection,
  expandedEventIds,
  toggleEventExpansion,
  expandedTenureGroups,
  toggleTenureGroupExpansion,
  selectedEventId,
  setSelectedEventId,
  setSummaryEventId,
  setShowSummaryModal,
  hasActiveFilters,
  handleResetFilters,
  isLoading,
}) => {
  const navigate = useNavigate()

  return (
    <List.CatalogSection>
      {/* 정렬 컨트롤 */}
      <List.ResultControls>
        <List.ToolbarMeta>
          <span>{filteredEvents.length}건</span>
        </List.ToolbarMeta>
        <div style={{ display: 'flex', gap: '10px', marginLeft: 'auto' }}>
          <List.SortSelect
            value={sortBy}
            aria-label="정렬 기준 선택"
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
              setSortBy(e.target.value as SortOption)
            }
          >
            <option value="recent">최근 발생 순</option>
            <option value="duration">장기 지속 순</option>
          </List.SortSelect>
          <List.SortDirectionToggle
            type="button"
            onClick={() =>
              // prop은 단순 setter 시그니처 — 업데이터 함수 대신 현재 값으로 계산
              setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
            }
          >
            {sortDirection === 'asc' ? <FiArrowUp /> : <FiArrowDown />}
          </List.SortDirectionToggle>
        </div>
      </List.ResultControls>

      {/* 목록 */}
      {isLoading ? (
        <List.CompactList>
          {[...Array(8)].map((_, index) => {
            const depth = index % 3
            return (
              <Skeleton.SkeletonListItem key={index} $depth={depth}>
                <Skeleton.SkeletonThumbnail $depth={depth} />
                <div style={{ flex: 1, padding: '12px 14px 12px 0' }}>
                  <Skeleton.SkeletonHeader>
                    <Skeleton.SkeletonExpandButton />
                    <Skeleton.SkeletonDot />
                    <Skeleton.SkeletonTitle />
                  </Skeleton.SkeletonHeader>
                  <Skeleton.SkeletonMeta />
                  <Skeleton.SkeletonSummary />
                </div>
              </Skeleton.SkeletonListItem>
            )
          })}
        </List.CompactList>
      ) : filteredEvents.length === 0 ? (
        <List.EmptyCatalogState>
          <List.EmptyIcon>
            <FiFilter size={44} />
          </List.EmptyIcon>
          <List.EmptyContent>
            <List.EmptyTitle>사건을 찾을 수 없습니다</List.EmptyTitle>
            <List.EmptyDescription>
              {events.length === 0
                ? '아직 등록된 사건이 없습니다. 새로운 사건을 등록해보세요.'
                : '검색 조건에 맞는 사건이 없습니다. 다른 조건으로 검색해보세요.'}
            </List.EmptyDescription>
          </List.EmptyContent>
          <List.EmptyActions>
            {hasActiveFilters && (
              <List.EmptyResetButton onClick={handleResetFilters}>
                <FiX size={14} />
                필터 초기화
              </List.EmptyResetButton>
            )}
            {events.length === 0 && (
              <List.EmptyCreateButton
                onClick={() => navigate(pathKeys.events.create())}
              >
                <FiPlus size={14} />새 사건 등록
              </List.EmptyCreateButton>
            )}
          </List.EmptyActions>
        </List.EmptyCatalogState>
      ) : (
        <List.CompactList>
          {/* TODO: 이 부분도 EventCard 컴포넌트로 분리 필요 (400줄) */}
          <div style={{ padding: '24px' }}>
            <p>이벤트 카드 목록은 향후 더 작은 컴포넌트로 분리 예정</p>
            <p>현재 {flattenedHierarchy.length}개의 이벤트</p>
          </div>
        </List.CompactList>
      )}
    </List.CatalogSection>
  )
}
