/**
 * Event Compact List Widget
 * FSD: widgets/event-list-compact/ui
 */
import React, { useMemo, useState } from 'react'

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
import type { HeadOfStateDuringEvent } from '@/shared/api/government-positions'
import { pathKeys } from '@/shared/router'

import type {
  EventHierarchyNode,
  HistoricalEvent,
} from '../../../pages/events/create/events.types'
import { HeadsOfStateYearGroupToggle } from '../../../pages/events/styles/list.styles'
import * as List from '../../../pages/events/styles/list.styles'
import * as Skeleton from '../../../pages/events/styles/skeleton.styles'
import {
  OtherHeadsOfStateList,
  TenureGroupFooter,
  TenureGroupHeader,
} from '../../tenure-group/ui'
import { EventListItem } from './event-list-item'

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
  /** 목록 전체 기간(모든 사건 min~max)에 해당하는 국가원수. 해당 기간 사건이 없어도 트럼프 등이 한 번은 보이도록 */
  periodHeadsOfState?: HeadOfStateDuringEvent[]
  dbCategories: EventCategoryDto[]
  totalCount?: number
  isLoadingMore?: boolean
  displayedCount?: number
  hasMoreData?: boolean
  bookmarks?: Set<string>
  onToggleExpansion: (eventId: string) => void
  onToggleTenureGroupExpansion: (tenureKey: string) => void
  onSelectEvent: (eventId: string) => void
  onShowSummary: (eventId: string) => void
  onSortChange: (sortBy: SortOption) => void
  onSortDirectionToggle: () => void
  onResetFilters: () => void
  onToggleBookmark?: (eventId: string) => void
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
  periodHeadsOfState = [],
  dbCategories,
  totalCount,
  isLoadingMore = false,
  displayedCount = 0,
  hasMoreData = false,
  bookmarks = new Set(),
  onToggleExpansion,
  onToggleTenureGroupExpansion,
  onSelectEvent,
  onShowSummary,
  onSortChange,
  onSortDirectionToggle,
  onResetFilters,
  onToggleBookmark,
  onScroll,
  pageSize = 20,
  onPageSizeChange,
}) => {
  const navigate = useNavigate()
  const [collapsedYears, setCollapsedYears] = useState<Set<number>>(new Set())
  /** 재위 년도 그룹 접기 (옛날 디자인: 첫 인물 카드 + "+N명" 펼치기) */
  const [expandedPersonYearGroups, setExpandedPersonYearGroups] = useState<
    Set<string>
  >(new Set())

  const togglePersonYearGroup = (key: string) => {
    setExpandedPersonYearGroups((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

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

  const { allYears, eventsByYear, tenureStartYearsSet, tenureEndYearsSet } =
    useMemo(() => {
      const eventYears = new Set<number>()
      const byYear = new Map<
        number,
        Array<{
          node: EventHierarchyNode
          depth: number
          parentEvent: HistoricalEvent | null
        }>
      >()
      let lastTopLevelYear: number | null = null
      flattenedHierarchy.forEach((item) => {
        const y = new Date(item.node.period.start).getFullYear()
        if (item.depth === 0) {
          eventYears.add(y)
          lastTopLevelYear = y
        }
        const year = lastTopLevelYear ?? y
        if (!byYear.has(year)) byYear.set(year, [])
        byYear.get(year)!.push(item)
      })
      periodHeadsOfState.forEach((h) => {
        eventYears.add(new Date(h.tenure.startDate).getFullYear())
        if (h.tenure.endDate)
          eventYears.add(new Date(h.tenure.endDate).getFullYear())
      })
      const tenureStartYearsSet = new Set(
        periodHeadsOfState.map((h) =>
          new Date(h.tenure.startDate).getFullYear(),
        ),
      )
      const tenureEndYearsSet = new Set(
        periodHeadsOfState
          .filter((h) => h.tenure.endDate)
          .map((h) => new Date(h.tenure.endDate!).getFullYear()),
      )
      const sortedYears = Array.from(eventYears).sort((a, b) => a - b)
      const orderedYears =
        sortDirection === 'desc' ? [...sortedYears].reverse() : sortedYears
      return {
        allYears: orderedYears,
        eventsByYear: byYear,
        tenureStartYearsSet,
        tenureEndYearsSet,
      }
    }, [flattenedHierarchy, sortDirection, periodHeadsOfState])

  return (
    <List.CatalogSection>
      <List.ResultControls>
        <List.ToolbarMeta>
          <span>{sortedEvents.length}건</span>
        </List.ToolbarMeta>
        {onPageSizeChange && (
          <div style={{ marginLeft: 'auto' }}>
            <List.SortSelect
              value={pageSize}
              aria-label="페이지 크기"
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                onPageSizeChange(Number(e.target.value))
              }
              style={{ width: '100px', fontSize: '12px', padding: '8px 10px' }}
            >
              <option value={20}>20개</option>
              <option value={50}>50개</option>
              <option value={100}>100개</option>
            </List.SortSelect>
          </div>
        )}
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
          {periodHeadsOfState.length > 0 && (
            <>
              <div
                style={{
                  padding: '8px 0 4px',
                  fontSize: '12px',
                  color: '#94a3b8',
                  fontWeight: 500,
                }}
              >
                이 목록에 포함된 시기의 재임 인물
              </div>
              <OtherHeadsOfStateList otherHeadsOfState={periodHeadsOfState} />
            </>
          )}
          {allYears.map((currentYear) => {
            const yearItems = eventsByYear.get(currentYear) ?? []
            const yearEventCount = yearItems.filter(
              (item) => item.depth === 0,
            ).length
            const isYearCollapsed = collapsedYears.has(currentYear)

            return (
              <React.Fragment key={`year-${currentYear}`}>
                <List.YearDivider
                  type="button"
                  onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                    e.preventDefault()
                    toggleYearCollapse(currentYear)
                  }}
                >
                  <span>
                    <FiChevronDown
                      size={13}
                      style={{
                        transform: isYearCollapsed
                          ? 'rotate(-90deg)'
                          : 'rotate(0deg)',
                        transition: 'transform 0.3s ease',
                      }}
                    />
                    {currentYear}년
                    <List.CollapsedCount>{yearEventCount}</List.CollapsedCount>
                  </span>
                </List.YearDivider>
                {isYearCollapsed ? (
                  <List.CollapsedPlaceholder>
                    <span>
                      {yearEventCount > 0
                        ? `${yearEventCount}개 사건이 접혀있습니다`
                        : `${currentYear}년`}
                    </span>
                  </List.CollapsedPlaceholder>
                ) : (
                  <>
                    {/* 재위 년도가 같은 취임: 옛날 디자인 = 첫 인물 카드 + "+N명" 접기/펼치기 */}
                    {(() => {
                      const headsStartInYear = periodHeadsOfState.filter(
                        (h) =>
                          new Date(h.tenure.startDate).getFullYear() ===
                          currentYear,
                      )
                      if (headsStartInYear.length === 0) return null
                      const primary = headsStartInYear[0]
                      const others = headsStartInYear.slice(1)
                      const startKey = `start-${currentYear}`
                      const isStartExpanded =
                        expandedPersonYearGroups.has(startKey)
                      return (
                        <List.HeadsOfStateYearGroup
                          key={`start-${currentYear}`}
                        >
                          <TenureGroupHeader
                            headOfState={primary}
                            otherHeadsOfState={others}
                            isExpanded={isStartExpanded}
                            onToggleExpansion={() =>
                              togglePersonYearGroup(startKey)
                            }
                            startYear={currentYear}
                          />
                          {others.length > 0 && isStartExpanded && (
                            <OtherHeadsOfStateList otherHeadsOfState={others} />
                          )}
                        </List.HeadsOfStateYearGroup>
                      )
                    })()}
                    {/* 재위 년도가 같은 퇴임: 접기 시 요약행, 펼치면 푸터 목록 */}
                    {(() => {
                      const headsEndInYear = periodHeadsOfState.filter(
                        (h) =>
                          h.tenure.endDate &&
                          new Date(h.tenure.endDate).getFullYear() ===
                            currentYear,
                      )
                      if (headsEndInYear.length === 0) return null
                      const endKey = `end-${currentYear}`
                      const isEndExpanded = expandedPersonYearGroups.has(endKey)
                      return (
                        <List.HeadsOfStateYearGroup key={`end-${currentYear}`}>
                          {headsEndInYear.length === 1 ? (
                            <TenureGroupFooter
                              headOfState={headsEndInYear[0]}
                              endYear={currentYear}
                            />
                          ) : (
                            <>
                              <HeadsOfStateYearGroupToggle
                                type="button"
                                onClick={() => togglePersonYearGroup(endKey)}
                              >
                                <FiChevronRight
                                  size={12}
                                  style={{
                                    transform: isEndExpanded
                                      ? 'rotate(90deg)'
                                      : 'rotate(0deg)',
                                    transition: 'transform 0.2s ease',
                                  }}
                                />
                                {currentYear}년 퇴임{' '}
                                <List.CollapsedCount>
                                  {headsEndInYear.length}명
                                </List.CollapsedCount>
                              </HeadsOfStateYearGroupToggle>
                              {isEndExpanded &&
                                headsEndInYear.map((head) => (
                                  <TenureGroupFooter
                                    key={`period-end-${head.person.id}-${head.tenure.endDate}`}
                                    headOfState={head}
                                    endYear={currentYear}
                                  />
                                ))}
                            </>
                          )}
                        </List.HeadsOfStateYearGroup>
                      )
                    })()}
                    {yearItems.map(({ node, depth, parentEvent }) => {
                      const hasChildren = Boolean(
                        node.children && node.children.length > 0,
                      )
                      const isExpanded = expandedEventIds.has(node.id)
                      const event =
                        events.find((e) => e.id === node.id) ?? parentEvent
                      if (!event) return null

                      const tenureGroup =
                        depth === 0
                          ? tenureGroups.find((group) =>
                              group.eventIds.includes(node.id),
                            )
                          : null
                      const isGroupStart =
                        tenureGroup &&
                        tenureGroup.eventIds[0] === node.id &&
                        depth === 0
                      const isGroupEnd =
                        tenureGroup &&
                        tenureGroup.eventIds[
                          tenureGroup.eventIds.length - 1
                        ] === node.id &&
                        depth === 0
                      const tenureStartYear = tenureGroup?.headOfState.tenure
                        .startDate
                        ? new Date(
                            tenureGroup.headOfState.tenure.startDate,
                          ).getFullYear()
                        : null
                      const tenureEndYear = tenureGroup?.headOfState.tenure
                        .endDate
                        ? new Date(
                            tenureGroup.headOfState.tenure.endDate,
                          ).getFullYear()
                        : null
                      const isInTenureGroup = tenureGroup && depth === 0
                      const tenureKey = tenureGroup
                        ? `${tenureGroup.headOfState.person.id}-${tenureGroup.headOfState.tenure.startDate}`
                        : ''
                      const showHeaderAtEvent =
                        isGroupStart &&
                        tenureGroup &&
                        (tenureStartYear == null ||
                          !tenureStartYearsSet.has(tenureStartYear))
                      const showFooterAtEvent =
                        isGroupEnd &&
                        tenureGroup &&
                        tenureEndYear != null &&
                        !tenureEndYearsSet.has(tenureEndYear)

                      return (
                        <React.Fragment key={node.id}>
                          {showHeaderAtEvent && tenureGroup && (
                            <>
                              <TenureGroupHeader
                                headOfState={tenureGroup.headOfState}
                                otherHeadsOfState={
                                  tenureGroup.otherHeadsOfState
                                }
                                isExpanded={expandedTenureGroups.has(tenureKey)}
                                onToggleExpansion={() =>
                                  onToggleTenureGroupExpansion(tenureKey)
                                }
                                startYear={tenureStartYear}
                              />
                              {tenureGroup.otherHeadsOfState?.length > 0 &&
                                expandedTenureGroups.has(tenureKey) && (
                                  <OtherHeadsOfStateList
                                    otherHeadsOfState={
                                      tenureGroup.otherHeadsOfState
                                    }
                                  />
                                )}
                            </>
                          )}
                          <EventListItem
                            node={node}
                            event={event}
                            depth={depth}
                            isExpanded={isExpanded}
                            hasChildren={hasChildren}
                            isActive={selectedEventId === node.id}
                            isInTenureGroup={!!isInTenureGroup}
                            dbCategories={dbCategories}
                            isBookmarked={bookmarks.has(node.id)}
                            onSelect={() => onSelectEvent(node.id)}
                            onToggleExpansion={() => onToggleExpansion(node.id)}
                            onShowSummary={() => onShowSummary(node.id)}
                            onToggleBookmark={
                              onToggleBookmark
                                ? () => onToggleBookmark(node.id)
                                : undefined
                            }
                          />
                          {showFooterAtEvent && tenureGroup && (
                            <TenureGroupFooter
                              headOfState={tenureGroup.headOfState}
                              endYear={tenureEndYear}
                            />
                          )}
                        </React.Fragment>
                      )
                    })}
                  </>
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
