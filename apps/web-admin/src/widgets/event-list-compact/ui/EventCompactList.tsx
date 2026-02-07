/**
 * Event Compact List Widget
 * FSD: widgets/event-list-compact/ui
 */
import React, { useState } from 'react'

import {
  FiArrowDown,
  FiArrowUp,
  FiChevronDown,
  FiChevronRight,
  FiFilter,
  FiPlus,
  FiX,
} from 'react-icons/fi'
import { useNavigate } from 'react-router-dom'

import type { SortOption } from '@/features/event-list/lib'
import type { EventCategoryDto } from '@/shared/api/event-categories'
import { pathKeys } from '@/shared/router'

import type {
  EventHierarchyNode,
  HistoricalEvent,
} from '../../../pages/events/create/events.types'
import * as List from '../../../pages/events/styles/list.styles'
import * as Skeleton from '../../../pages/events/styles/skeleton.styles'
import {
  OtherHeadsOfStateList,
  TenureGroupFooter,
  TenureGroupHeader,
} from '../../tenure-group/ui'
import { EventListItem } from './EventListItem'

interface TenureGroup {
  headOfState: any
  otherHeadsOfState: any[]
  eventIds: string[]
  startIndex: number
  endIndex: number
}

interface EventCompactListProps {
  isLoading: boolean
  flattenedHierarchy: Array<{
    node: EventHierarchyNode
    depth: number
    parentEvent: HistoricalEvent | null
  }>
  events: HistoricalEvent[]
  filteredEvents: HistoricalEvent[]
  sortedEvents: HistoricalEvent[]
  expandedEventIds: Set<string>
  expandedTenureGroups: Set<string>
  selectedEventId: string | null
  sortBy: SortOption
  sortDirection: 'asc' | 'desc'
  hasActiveFilters: boolean
  tenureGroups: TenureGroup[]
  dbCategories: EventCategoryDto[]
  totalCount?: number // 총 개수
  isLoadingMore?: boolean // 추가 로딩 상태
  displayedCount?: number // 현재 표시된 개수
  hasMoreData?: boolean // 더 불러올 데이터가 있는지
  onToggleExpansion: (eventId: string) => void
  onToggleTenureGroupExpansion: (tenureKey: string) => void
  onSelectEvent: (eventId: string) => void
  onShowSummary: (eventId: string) => void
  onSortChange: (sortBy: SortOption) => void
  onSortDirectionToggle: () => void
  onResetFilters: () => void
  onScroll?: (e: React.UIEvent<HTMLDivElement>) => void
  pageSize?: number
  onPageSizeChange?: (size: number) => void
}

export const EventCompactList: React.FC<EventCompactListProps> = ({
  isLoading,
  flattenedHierarchy,
  events,
  filteredEvents,
  sortedEvents,
  expandedEventIds,
  expandedTenureGroups,
  selectedEventId,
  sortBy,
  sortDirection,
  hasActiveFilters,
  tenureGroups,
  dbCategories,
  totalCount,
  isLoadingMore = false,
  displayedCount = 0,
  hasMoreData = false,
  onToggleExpansion,
  onToggleTenureGroupExpansion,
  onSelectEvent,
  onShowSummary,
  onSortChange,
  onSortDirectionToggle,
  onResetFilters,
  onScroll,
  pageSize = 20,
  onPageSizeChange,
}) => {
  const navigate = useNavigate()
  const [collapsedYears, setCollapsedYears] = useState<Set<number>>(new Set())

  const toggleYearCollapse = (year: number) => {
    setCollapsedYears((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(year)) {
        newSet.delete(year)
      } else {
        newSet.add(year)
      }
      return newSet
    })
  }

  return (
    <List.CatalogSection>
      <List.ResultControls>
        <List.ToolbarMeta>
          <span>{sortedEvents.length}건</span>
        </List.ToolbarMeta>
        <div
          style={{
            display: 'flex',
            gap: '10px',
            marginLeft: 'auto',
            alignItems: 'center',
          }}
        >
          {onPageSizeChange && (
            <List.SortSelect
              value={pageSize}
              aria-label="페이지 크기 선택"
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                onPageSizeChange(Number(e.target.value))
              }
              style={{ width: '110px' }}
            >
              <option value={20}>20개씩</option>
              <option value={50}>50개씩</option>
              <option value={100}>100개씩</option>
            </List.SortSelect>
          )}
          <List.SortSelect
            value={sortBy}
            aria-label="정렬 기준 선택"
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
              onSortChange(e.target.value as SortOption)
            }
          >
            <option value="recent">최근 발생 순</option>
            <option value="duration">장기 지속 순</option>
          </List.SortSelect>
          <List.SortDirectionToggle
            type="button"
            onClick={onSortDirectionToggle}
          >
            {sortDirection === 'asc' ? <FiArrowUp /> : <FiArrowDown />}
          </List.SortDirectionToggle>
        </div>
      </List.ResultControls>

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
              <List.EmptyResetButton onClick={onResetFilters}>
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
        <List.CompactList onScroll={onScroll}>
          {flattenedHierarchy.map(({ node, depth, parentEvent }, index) => {
            const hasChildren = node.children && node.children.length > 0
            const isExpanded = expandedEventIds.has(node.id)
            const event = events.find((e) => e.id === node.id) ?? parentEvent

            if (!event) return null

            // 년도 구분선 표시 여부 체크 (depth 0인 최상위 사건만)
            const currentYear = new Date(node.period.start).getFullYear()
            const prevEvent = index > 0 ? flattenedHierarchy[index - 1] : null
            const prevYear = prevEvent
              ? new Date(prevEvent.node.period.start).getFullYear()
              : null
            const showYearDivider =
              depth === 0 &&
              (index === 0 || (prevYear !== null && currentYear !== prevYear))

            // 이 년도가 접혀있는지 확인
            const isYearCollapsed = collapsedYears.has(currentYear)

            // 접힌 년도의 사건은 렌더링하지 않음 (년도 구분선만 표시)
            if (isYearCollapsed && depth === 0) {
              if (showYearDivider) {
                // 이 년도의 사건 개수 계산
                const yearEventCount = flattenedHierarchy.filter(
                  (item) =>
                    item.depth === 0 &&
                    new Date(item.node.period.start).getFullYear() ===
                      currentYear,
                ).length

                return (
                  <List.YearDivider
                    key={`year-${currentYear}`}
                    type="button"
                    onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                      e.preventDefault()
                      toggleYearCollapse(currentYear)
                    }}
                  >
                    <span>
                      <FiChevronRight size={14} />
                      {currentYear}년
                      <List.CollapsedCount>
                        {yearEventCount}건
                      </List.CollapsedCount>
                    </span>
                  </List.YearDivider>
                )
              }
              return null
            }

            // 이 사건이 속한 집권 기간 그룹 찾기
            const tenureGroup =
              depth === 0
                ? tenureGroups.find((group) => group.eventIds.includes(node.id))
                : null

            // 이 사건이 그룹의 첫 번째/마지막 사건인지 확인
            const isGroupStart =
              tenureGroup && tenureGroup.eventIds[0] === node.id && depth === 0

            const isGroupEnd =
              tenureGroup &&
              tenureGroup.eventIds[tenureGroup.eventIds.length - 1] ===
                node.id &&
              depth === 0

            const isInTenureGroup = tenureGroup && depth === 0

            const tenureKey = tenureGroup
              ? `${tenureGroup.headOfState.person.id}-${tenureGroup.headOfState.tenure.startDate}`
              : ''

            return (
              <React.Fragment key={node.id}>
                {/* 년도 구분선 */}
                {showYearDivider && (
                  <List.YearDivider
                    type="button"
                    onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                      e.preventDefault()
                      toggleYearCollapse(currentYear)
                    }}
                  >
                    <span>
                      <FiChevronDown size={14} />
                      {currentYear}년
                    </span>
                  </List.YearDivider>
                )}
                {/* 집권 기간 그룹 헤더 */}
                {isGroupStart && tenureGroup && (
                  <>
                    <TenureGroupHeader
                      headOfState={tenureGroup.headOfState}
                      otherHeadsOfState={tenureGroup.otherHeadsOfState}
                      isExpanded={expandedTenureGroups.has(tenureKey)}
                      onToggleExpansion={() =>
                        onToggleTenureGroupExpansion(tenureKey)
                      }
                    />
                    {/* 다른 국가 원수 리스트 */}
                    {tenureGroup.otherHeadsOfState &&
                      tenureGroup.otherHeadsOfState.length > 0 &&
                      expandedTenureGroups.has(tenureKey) && (
                        <OtherHeadsOfStateList
                          otherHeadsOfState={tenureGroup.otherHeadsOfState}
                        />
                      )}
                  </>
                )}

                {/* 이벤트 리스트 아이템 */}
                <EventListItem
                  node={node}
                  event={event}
                  depth={depth}
                  isExpanded={isExpanded}
                  hasChildren={hasChildren}
                  isActive={selectedEventId === node.id}
                  isInTenureGroup={!!isInTenureGroup}
                  dbCategories={dbCategories}
                  onSelect={() => onSelectEvent(node.id)}
                  onToggleExpansion={() => onToggleExpansion(node.id)}
                  onShowSummary={() => onShowSummary(node.id)}
                />

                {/* 집권 기간 그룹 푸터 */}
                {isGroupEnd && tenureGroup && (
                  <TenureGroupFooter headOfState={tenureGroup.headOfState} />
                )}
              </React.Fragment>
            )
          })}

          {/* 로딩 인디케이터 */}
          {isLoadingMore && (
            <div
              style={{
                padding: '40px',
                textAlign: 'center',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '12px',
              }}
            >
              <List.LoadingSpinner />
              <div
                style={{
                  color: '#94a3b8',
                  fontSize: '13px',
                  fontWeight: '500',
                }}
              >
                로딩 중
              </div>
            </div>
          )}
          {!isLoadingMore && hasMoreData && (
            <div
              style={{
                padding: '32px',
                textAlign: 'center',
                color: '#cbd5e1',
                fontSize: '12px',
                fontWeight: '500',
              }}
            >
              ↓
            </div>
          )}
        </List.CompactList>
      )}
    </List.CatalogSection>
  )
}
