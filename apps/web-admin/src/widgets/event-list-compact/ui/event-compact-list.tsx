/**
 * Event Compact List Widget
 * FSD: widgets/event-list-compact/ui
 */
import React, { useMemo, useState } from 'react'

import {
  FiChevronDown,
  FiChevronRight,
  FiFilter,
  FiPlus,
  FiX,
} from 'react-icons/fi'
import { useNavigate } from 'react-router-dom'
import styled from 'styled-components'

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
  expandedEventIds: Set<string>
  expandedTenureGroups: Set<string>
  selectedEventId: string | null
  sortDirection: 'asc' | 'desc'
  hasActiveFilters: boolean
  /** 활성 필터 칩 — 빈 결과 안내에서 어떤 필터가 적용 중인지 보여주는 데 사용 */
  activeFilterChips?: Array<{ key: string; label: string; onClear: () => void }>
  tenureGroups: TenureGroup[]
  /** 목록 전체 기간(모든 사건 min~max)에 해당하는 국가원수. 해당 기간 사건이 없어도 트럼프 등이 한 번은 보이도록 */
  periodHeadsOfState?: HeadOfStateDuringEvent[]
  dbCategories: EventCategoryDto[]
  isLoadingMore?: boolean
  displayedCount?: number
  hasMoreData?: boolean
  bookmarks?: Set<string>
  onToggleExpansion: (eventId: string) => void
  onToggleTenureGroupExpansion: (tenureKey: string) => void
  onSelectEvent: (eventId: string) => void
  onShowSummary: (eventId: string) => void
  onResetFilters: () => void
  onToggleBookmark?: (eventId: string) => void
  onScroll?: (e: React.UIEvent<HTMLDivElement>) => void
  /** 로딩 skeleton 갯수 산정에만 사용 — 페이지 크기 컨트롤은 부모(ViewSwitcherRow)에 있음 */
  pageSize?: number
}

export const EventCompactList: React.FC<EventCompactListProps> = ({
  isLoading,
  flattenedHierarchy,
  events,
  expandedEventIds,
  expandedTenureGroups,
  selectedEventId,
  sortDirection,
  hasActiveFilters,
  activeFilterChips = [],
  tenureGroups,
  periodHeadsOfState = [],
  dbCategories,
  isLoadingMore = false,
  displayedCount = 0,
  hasMoreData = false,
  bookmarks = new Set(),
  onToggleExpansion,
  onToggleTenureGroupExpansion,
  onSelectEvent,
  onShowSummary,
  onResetFilters,
  onToggleBookmark,
  onScroll,
  pageSize = 20,
}) => {
  const navigate = useNavigate()
  const [collapsedYears, setCollapsedYears] = useState<Set<number>>(new Set())
  /** 세기 접기 — 세기 자체를 토글하면 그 안의 모든 년이 표시 안 됨 */
  const [collapsedCenturies, setCollapsedCenturies] = useState<Set<number>>(
    new Set(),
  )
  const toggleCenturyCollapse = (century: number) => {
    setCollapsedCenturies((prev) => {
      const next = new Set(prev)
      if (next.has(century)) next.delete(century)
      else next.add(century)
      return next
    })
  }
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

  const {
    allYears,
    eventsByYear,
    tenureStartYearsSet,
    tenureEndYearsSet,
    centuryCount,
  } = useMemo(() => {
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

    /** 세기별 사건 수 — flattenedHierarchy의 depth 0 사건만 집계.
     *  `Math.floor(year / 100) + 1`이 그 사건의 세기. (1950 → 20세기) */
    const centuryCount = new Map<number, number>()
    for (const item of flattenedHierarchy) {
      if (item.depth !== 0) continue
      const y = new Date(item.node.period.start).getFullYear()
      const c = Math.floor(y / 100) + 1
      centuryCount.set(c, (centuryCount.get(c) ?? 0) + 1)
    }

    return {
      allYears: orderedYears,
      eventsByYear: byYear,
      tenureStartYearsSet,
      tenureEndYearsSet,
      centuryCount,
    }
  }, [flattenedHierarchy, sortDirection, periodHeadsOfState])

  return (
    <List.CatalogSection>
      {isLoading ? (
        <List.CompactList>
          {[...Array(Math.min(pageSize, 12))].map((_, index) => {
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
      ) : flattenedHierarchy.length === 0 ? (
        <List.EmptyCatalogState>
          <List.EmptyIcon>
            <FiFilter size={44} />
          </List.EmptyIcon>
          <List.EmptyContent>
            <List.EmptyTitle>
              {events.length === 0
                ? '아직 등록된 사건이 없습니다'
                : hasActiveFilters
                  ? `현재 조건과 일치하는 사건이 없습니다`
                  : '사건을 찾을 수 없습니다'}
            </List.EmptyTitle>
            <List.EmptyDescription>
              {events.length === 0
                ? '새로운 사건을 등록해보세요.'
                : hasActiveFilters
                  ? '아래 활성 필터 중 하나를 해제하거나, 모두 초기화해보세요.'
                  : '다른 조건으로 검색해보세요.'}
            </List.EmptyDescription>
            {hasActiveFilters && activeFilterChips.length > 0 && (
              <ActiveChipsRow>
                {activeFilterChips.map((chip) => (
                  <ActiveChip key={chip.key} onClick={chip.onClear}>
                    <span>{chip.label}</span>
                    <FiX size={12} aria-hidden="true" />
                  </ActiveChip>
                ))}
              </ActiveChipsRow>
            )}
          </List.EmptyContent>
          <List.EmptyActions>
            {hasActiveFilters && (
              <List.EmptyResetButton onClick={onResetFilters}>
                <FiX size={14} />
                모든 필터 초기화
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
              <PeriodHeadsLabel>
                이 목록에 포함된 시기의 재임 인물
              </PeriodHeadsLabel>
              <OtherHeadsOfStateList otherHeadsOfState={periodHeadsOfState} />
            </>
          )}
          {(() => {
            // 이전 행이 어느 세기였는지 추적 — 세기가 바뀌면 헤더 삽입.
            // map 안에서는 외부 변수 mutation이 어려워 reduce 패턴으로.
            let prevCentury: number | null = null
            return allYears.map((currentYear) => {
              const yearItems = eventsByYear.get(currentYear) ?? []
              const yearEventCount = yearItems.filter(
                (item) => item.depth === 0,
              ).length
              const isYearCollapsed = collapsedYears.has(currentYear)

              const century = Math.floor(currentYear / 100) + 1
              const isCenturyChange = prevCentury !== century
              const isCenturyCollapsed = collapsedCenturies.has(century)
              prevCentury = century

              // 세기 접힘 → 그 세기 안의 년도는 모두 숨김 (헤더만 노출)
              if (isCenturyCollapsed && !isCenturyChange) return null

              return (
              <React.Fragment key={`year-${currentYear}`}>
                {isCenturyChange && (
                  <List.CenturyDivider
                    type="button"
                    aria-expanded={!isCenturyCollapsed}
                    aria-label={`${century}세기 — 사건 ${centuryCount.get(century) ?? 0}건 ${
                      isCenturyCollapsed ? '펼치기' : '접기'
                    }`}
                    onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                      e.preventDefault()
                      toggleCenturyCollapse(century)
                    }}
                  >
                    <List.CenturyDividerLabel>
                      <FiChevronDown
                        size={14}
                        aria-hidden="true"
                        style={{
                          transform: isCenturyCollapsed
                            ? 'rotate(-90deg)'
                            : 'rotate(0deg)',
                          transition: 'transform 0.3s ease',
                        }}
                      />
                      <span>
                        {century}세기
                        <List.CenturyDividerYears>
                          {' '}({century === 1 ? 1 : (century - 1) * 100 + 1}
                          –{century * 100})
                        </List.CenturyDividerYears>
                      </span>
                    </List.CenturyDividerLabel>
                    <List.CenturyDividerCount>
                      {(centuryCount.get(century) ?? 0).toLocaleString()}건
                    </List.CenturyDividerCount>
                  </List.CenturyDivider>
                )}
                {isCenturyCollapsed ? null : (
                  <>
                <List.YearDivider
                  type="button"
                  aria-expanded={!isYearCollapsed}
                  aria-label={`${currentYear}년 — 사건 ${yearEventCount}건 ${
                    isYearCollapsed ? '펼치기' : '접기'
                  }`}
                  onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                    e.preventDefault()
                    toggleYearCollapse(currentYear)
                  }}
                >
                  <span>
                    <FiChevronDown
                      size={13}
                      aria-hidden="true"
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
                  </>
                )}
              </React.Fragment>
            )
            })
          })()}

          {/* 로딩 / 끝 안내 — 사용자가 "더 있는지" "끝인지" 즉시 알 수 있도록 */}
          {isLoadingMore && (
            <LoadingMoreRow>
              <List.LoadingSpinner />
              <LoadingMoreText>더 불러오는 중…</LoadingMoreText>
            </LoadingMoreRow>
          )}
          {!isLoadingMore && hasMoreData && (
            <LoadingMoreRow aria-hidden="true">
              <ScrollHintInline>↓ 스크롤하여 더 보기</ScrollHintInline>
            </LoadingMoreRow>
          )}
          {!isLoadingMore && !hasMoreData && displayedCount > 0 && (
            <LoadingMoreRow>
              <EndOfListText>
                끝까지 봤습니다 · 총 {displayedCount.toLocaleString()}건
              </EndOfListText>
            </LoadingMoreRow>
          )}
        </List.CompactList>
      )}
    </List.CatalogSection>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// styled (theme-aware)
// ─────────────────────────────────────────────────────────────────────────────

const PeriodHeadsLabel = styled.div`
  padding: 8px 0 4px;
  font-size: 12px;
  font-weight: 500;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const LoadingMoreRow = styled.div`
  padding: 40px;
  text-align: center;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
`

const LoadingMoreText = styled.div`
  color: ${({ theme }) => theme.colors.text.tertiary};
  font-size: 13px;
  font-weight: 500;
`

const ScrollHint = styled.div`
  padding: 32px;
  text-align: center;
  font-size: 12px;
  font-weight: 500;
  color: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.16)' : '#cbd5e1'};
`

const ScrollHintInline = styled.span`
  font-size: 12.5px;
  font-weight: 500;
  color: ${({ theme }) => theme.colors.text.tertiary};
  letter-spacing: 0.02em;
`

const ActiveChipsRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 6px;
  margin-top: 14px;
  max-width: 480px;
`

const ActiveChip = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  border-radius: 999px;
  border: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.16)' : 'rgba(15,23,42,0.16)'};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.04)' : 'rgba(15,23,42,0.03)'};
  color: ${({ theme }) => theme.colors.text.secondary};
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.14s, border-color 0.14s, color 0.14s;

  svg {
    opacity: 0.6;
  }

  &:hover {
    background: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(15,23,42,0.06)'};
    color: ${({ theme }) => theme.colors.text.primary};
    svg {
      opacity: 1;
    }
  }
`

const EndOfListText = styled.span`
  font-size: 12.5px;
  font-weight: 500;
  color: ${({ theme }) => theme.colors.text.tertiary};
  letter-spacing: 0.02em;
  font-variant-numeric: tabular-nums;

  &::before {
    content: '·';
    margin-right: 8px;
    opacity: 0.5;
  }
  &::after {
    content: '·';
    margin-left: 8px;
    opacity: 0.5;
  }
`
