/**
 * Event Compact List Widget
 * FSD: widgets/event-list-compact/ui
 */
import React, { useMemo, useState } from 'react'

import {
  FiAlertCircle,
  FiChevronDown,
  FiFilter,
  FiInbox,
  FiPlus,
  FiSearch,
  FiX,
} from 'react-icons/fi'
import { useNavigate } from 'react-router-dom'
import styled, { css } from 'styled-components'

import type { SortOption } from '@/features/event-list/lib'
import type { EventCategoryDto } from '@/shared/api/event-categories'
import { getCentury, parseIsoDateParts } from '@/shared/lib/iso-date'
import { pathKeys } from '@/shared/router'

import type {
  EventHierarchyNode,
  HistoricalEvent,
} from '../../../pages/events/create/events.types'
import * as List from '../../../pages/events/styles/list.styles'
import { shimmerAnimation } from '../../../pages/events/styles/shared.styles'
import { BRAND } from '../../../pages/events/styles/theme'
import { EventListItem } from './event-list-item'

interface EventCompactListProps {
  isLoading: boolean
  flattenedHierarchy: Array<{
    node: EventHierarchyNode
    depth: number
    parentEvent: HistoricalEvent | null
  }>
  events: HistoricalEvent[]
  expandedEventIds: Set<string>
  selectedEventId: string | null
  sortDirection: 'asc' | 'desc'
  hasActiveFilters: boolean
  /** 활성 필터 칩 — 빈 결과 안내에서 어떤 필터가 적용 중인지 보여주는 데 사용 */
  activeFilterChips?: Array<{ key: string; label: string; onClear: () => void }>
  dbCategories: EventCategoryDto[]
  isLoadingMore?: boolean
  displayedCount?: number
  hasMoreData?: boolean
  /** 이미 일부 로드된 뒤 다음 페이지 로드가 실패한 상태 — 하단 인라인 재시도 노출 */
  loadMoreFailed?: boolean
  onRetryLoadMore?: () => void
  bookmarks?: Set<string>
  /** 사용자 입력 검색어 — Title의 매칭 부분 강조에 사용 */
  searchQuery?: string
  /** 최근 본 사건 ID — 필터 결과 0건 빈 상태에서 fallback 추천으로 노출 */
  recentEventIds?: string[]
  onToggleExpansion: (eventId: string) => void
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
  selectedEventId,
  sortDirection,
  hasActiveFilters,
  activeFilterChips = [],
  dbCategories,
  isLoadingMore = false,
  displayedCount = 0,
  hasMoreData = false,
  loadMoreFailed = false,
  onRetryLoadMore,
  bookmarks = new Set(),
  searchQuery,
  recentEventIds = [],
  onToggleExpansion,
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

  /** id→event O(1) 조회 — 행마다 events.find로 선형 탐색하던 핫패스 제거 */
  const eventById = useMemo(() => {
    const m = new Map<string, HistoricalEvent>()
    for (const e of events) m.set(e.id, e)
    return m
  }, [events])

  const { allYears, eventsByYear, centuryCount, unknownItems } = useMemo(() => {
    const eventYears = new Set<number>()
    const byYear = new Map<number, typeof flattenedHierarchy>()
    /**
     * 연도를 전혀 확정할 수 없는 항목(날짜 완전 미상 + 귀속시킬 상위 연도도 없음)을 모으는 버킷.
     * 이전엔 year===null이면 조용히 *드롭*됐다 → (a) 오름차순에서 날짜 완전 미상 최상위 사건이
     * 목록 맨 앞으로 정렬돼 통째 사라지고, (b) '북마크만'으로 부모 없이 남은 자식이 화면에서
     * 통째 사라졌다("1건"인데 빈 화면). 절대 드롭하지 않고 여기 모아 '연도 미상' 섹션으로 렌더한다.
     */
    const unknownItems: typeof flattenedHierarchy = []
    /** 세기별 사건 수 — depth 0만, *실제 버킷 귀속 연도* 기준(연 헤더 카운트 합과 정합). */
    const centuryCount = new Map<number, number>()
    let lastTopLevelYear: number | null = null
    flattenedHierarchy.forEach((item) => {
      // BC·고대 날짜 안전 파싱(네이티브 Date 금지).
      const parsedYear = parseIsoDateParts(item.node.period.start)?.year ?? null
      if (item.depth === 0 && parsedYear !== null) {
        lastTopLevelYear = parsedYear
      }
      // 버킷 귀속 연도: 최상위는 자기 연도 우선, 자식은 직전 최상위(부모) 연도 우선.
      // 어느 쪽도 없으면(부모가 필터로 사라진 자식 등) 자기 연도로 폴백한다 → 그래도 null이면 미상.
      const bucketYear =
        item.depth === 0
          ? parsedYear ?? lastTopLevelYear
          : lastTopLevelYear ?? parsedYear
      if (bucketYear === null) {
        unknownItems.push(item)
        return
      }
      // depth 무관하게 add — 부모 없이 자식 연도로 버킷팅한 경우에도 allYears에 버킷이
      // 존재해야 렌더 루프(allYears.map)가 그 연도를 순회한다.
      eventYears.add(bucketYear)
      if (!byYear.has(bucketYear)) byYear.set(bucketYear, [])
      byYear.get(bucketYear)!.push(item)
      // getCentury(year)로 BC 음수 세기까지 정합(1950 → 20세기).
      if (item.depth === 0) {
        const centuryOfBucket = getCentury(bucketYear)
        centuryCount.set(
          centuryOfBucket,
          (centuryCount.get(centuryOfBucket) ?? 0) + 1,
        )
      }
    })
    const sortedYears = Array.from(eventYears).sort(
      (yearA, yearB) => yearA - yearB,
    )
    const orderedYears =
      sortDirection === 'desc' ? [...sortedYears].reverse() : sortedYears

    return {
      allYears: orderedYears,
      eventsByYear: byYear,
      centuryCount,
      unknownItems,
    }
  }, [flattenedHierarchy, sortDirection])

  return (
    <List.CatalogSection>
      {isLoading ? (
        <List.CompactList>
          {[...Array(Math.min(pageSize, 12))].map((_, index) => {
            // 실제 행(단일 행: 레일 dot + [연도][카테고리칩][제목])과 동일 구조로 렌더 →
            // 로딩→데이터 전환 시 높이·요소 위치 점프 없음.
            const depth = index % 3
            // 동일 폭 반복 회피 — index 기반 폭으로 자연스러운 다양성
            const titleW = 40 + ((index * 13) % 30) // 40~70%
            const categoryW = 40 + ((index * 7) % 24) // 40~64px
            return (
              <SkeletonStop key={index} $depth={depth}>
                <SkeletonRail aria-hidden="true" />
                <SkeletonBody>
                  <SkeletonYear />
                  <SkeletonCategory style={{ width: `${categoryW}px` }} />
                  <SkeletonTitleBar style={{ width: `${titleW}%` }} />
                </SkeletonBody>
              </SkeletonStop>
            )
          })}
        </List.CompactList>
      ) : flattenedHierarchy.length === 0 ? (
        <List.EmptyCatalogState>
          {/* 상태별 아이콘 — 빈 DB(수신함)·필터결과0(깔때기)·검색무결과(돋보기)로 구별해
           * '필터 때문에 안 보이나?' 오해를 없앤다. */}
          <List.EmptyIcon>
            {events.length === 0 ? (
              <FiInbox size={44} />
            ) : hasActiveFilters ? (
              <FiFilter size={44} />
            ) : (
              <FiSearch size={44} />
            )}
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
          {/* 필터 결과 0건이지만 사용자가 *최근 본 사건*은 있는 경우 — fallback 추천.
           * 빈 화면에서 "여기서 갈 곳" 단서 제공. recentEvents는 localStorage 기반 ID. */}
          {hasActiveFilters && recentEventIds.length > 0 && (() => {
            const byId = new Map(events.map((e) => [e.id, e]))
            const fallbackItems = recentEventIds
              .map((id) => byId.get(id))
              .filter((e): e is HistoricalEvent => Boolean(e))
              .slice(0, 5)
            if (fallbackItems.length === 0) return null
            return (
              <FallbackSection>
                <FallbackHeading>최근 본 사건</FallbackHeading>
                <FallbackList>
                  {fallbackItems.map((e) => (
                    <FallbackItem
                      key={e.id}
                      type="button"
                      onClick={() => onSelectEvent(e.id)}
                    >
                      <FallbackTitle>{e.title}</FallbackTitle>
                    </FallbackItem>
                  ))}
                </FallbackList>
              </FallbackSection>
            )
          })()}
        </List.EmptyCatalogState>
      ) : (
        <List.CompactList
          onScroll={onScroll}
          role="list"
          aria-label={`사건 목록 (${displayedCount.toLocaleString()}건)`}
        >
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

              const century = getCentury(currentYear)
              const isCenturyChange = prevCentury !== century
              const isCenturyCollapsed = collapsedCenturies.has(century)
              prevCentury = century

              // 세기 라벨/범위 — getCentury 정의(양수 ceil, 음수 BC)에 맞춰 BC 안전.
              // 양수 c: (c-1)*100+1 ~ c*100 (예: 20세기 → 1901~2000, 1세기 → 1~100)
              // 음수 c(BC): |c|세기 = (|c|-1)*100+1 ~ |c|*100 BC
              const absCentury = Math.abs(century)
              const centuryLabel =
                century < 0
                  ? `기원전 ${absCentury}세기`
                  : `${century}세기`
              const centuryRangeFrom = absCentury === 1 ? 1 : (absCentury - 1) * 100 + 1
              const centuryRangeTo = absCentury * 100
              const centuryRangeLabel =
                century < 0
                  ? `기원전 ${centuryRangeTo}–${centuryRangeFrom}`
                  : `${centuryRangeFrom}–${centuryRangeTo}`

              // 세기 접힘 → 그 세기 안의 년도는 모두 숨김 (헤더만 노출)
              if (isCenturyCollapsed && !isCenturyChange) return null

              return (
              <React.Fragment key={`year-${currentYear}`}>
                {isCenturyChange && (
                  <List.CenturyDivider
                    type="button"
                    aria-expanded={!isCenturyCollapsed}
                    aria-label={`${centuryLabel} — 사건 ${centuryCount.get(century) ?? 0}건 ${
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
                        }}
                      />
                      <span>
                        {centuryLabel}
                        <List.CenturyDividerYears>
                          {' '}({centuryRangeLabel})
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
                    {yearItems.map(({ node, depth, parentEvent }) => {
                      const hasChildren = Boolean(
                        node.children && node.children.length > 0,
                      )
                      const isExpanded = expandedEventIds.has(node.id)
                      const event = eventById.get(node.id) ?? parentEvent
                      if (!event) return null

                      return (
                        <EventListItem
                          key={node.id}
                          node={node}
                          event={event}
                          depth={depth}
                          isExpanded={isExpanded}
                          hasChildren={hasChildren}
                          isActive={selectedEventId === node.id}
                          dbCategories={dbCategories}
                          isBookmarked={bookmarks.has(node.id)}
                          searchQuery={searchQuery}
                          // 이 행이 속한 연 그룹 — 같은 해면 선두 토큰을 월·일로 대체(연도 중복 제거)
                          groupYear={currentYear}
                          // 안정 참조 전달 — 행마다 새 화살표를 만들지 않아 EventListItem의
                          // React.memo가 실효. id는 EventListItem이 node.id로 직접 전달.
                          onSelect={onSelectEvent}
                          onToggleExpansion={onToggleExpansion}
                          onShowSummary={onShowSummary}
                          onToggleBookmark={onToggleBookmark}
                        />
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

          {/* 연도 미상 — period.start가 비었거나 파싱 불가하고 귀속할 상위 연도도 없는 항목.
           * 그룹핑에서 드롭하지 않고 여기 모아 렌더한다(자식만 남은 북마크 필터·날짜 완전 미상). */}
          {unknownItems.length > 0 && (
            <React.Fragment key="year-unknown">
              <List.UnknownYearDivider as="div" style={{ cursor: 'default' }}>
                <span>
                  연도 미상
                  <List.CollapsedCount>{unknownItems.length}</List.CollapsedCount>
                </span>
              </List.UnknownYearDivider>
              {unknownItems.map(({ node, depth, parentEvent }) => {
                const hasChildren = Boolean(
                  node.children && node.children.length > 0,
                )
                const isExpanded = expandedEventIds.has(node.id)
                const event = eventById.get(node.id) ?? parentEvent
                if (!event) return null
                return (
                  <EventListItem
                    key={node.id}
                    node={node}
                    event={event}
                    depth={depth}
                    isExpanded={isExpanded}
                    hasChildren={hasChildren}
                    isActive={selectedEventId === node.id}
                    dbCategories={dbCategories}
                    isBookmarked={bookmarks.has(node.id)}
                    searchQuery={searchQuery}
                    onSelect={onSelectEvent}
                    onToggleExpansion={onToggleExpansion}
                    onShowSummary={onShowSummary}
                    onToggleBookmark={onToggleBookmark}
                  />
                )
              })}
            </React.Fragment>
          )}

          {/* 로딩 / 끝 안내 — 사용자가 "어디까지 봤는지·더 있는지·끝인지" 즉시 알 수 있도록.
           * displayedCount를 모든 상태에 노출해 스크롤 중에도 진행도가 보임. */}
          {isLoadingMore && (
            <LoadingMoreRow role="status" aria-live="polite">
              <List.LoadingSpinner />
              <LoadingMoreText>
                {displayedCount > 0
                  ? `${displayedCount.toLocaleString()}건 표시 · 더 불러오는 중…`
                  : '더 불러오는 중…'}
              </LoadingMoreText>
            </LoadingMoreRow>
          )}
          {/* 부분 로드 실패 — 전역 에러 배너(events.length===0)엔 안 걸리는 조용한 누락을
           * 인라인으로 노출하고 재시도 진입점을 준다. */}
          {loadMoreFailed && !isLoadingMore && (
            <LoadingMoreRow role="alert">
              <LoadMoreErrorText>
                <FiAlertCircle
                  size={14}
                  aria-hidden="true"
                  style={{ flexShrink: 0, verticalAlign: '-2px', marginRight: 6 }}
                />
                일부 사건을 불러오지 못했습니다.
              </LoadMoreErrorText>
              {onRetryLoadMore && (
                <RetryLoadMoreButton type="button" onClick={onRetryLoadMore}>
                  다시 시도
                </RetryLoadMoreButton>
              )}
            </LoadingMoreRow>
          )}
          {!isLoadingMore && hasMoreData && !loadMoreFailed && (
            <LoadingMoreRow aria-hidden="true">
              <ScrollHintInline>
                {displayedCount > 0
                  ? `${displayedCount.toLocaleString()}건 표시 · ↓ 스크롤하여 더 보기`
                  : '↓ 스크롤하여 더 보기'}
              </ScrollHintInline>
            </LoadingMoreRow>
          )}
          {!isLoadingMore && !hasMoreData && displayedCount > 0 && (
            <LoadingMoreRow role="status" aria-live="polite">
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

const LoadMoreErrorText = styled.span`
  font-size: 13px;
  font-weight: 500;
  color: ${({ theme }) => (theme.mode === 'dark' ? '#fca5a5' : '#dc2626')};
`

const RetryLoadMoreButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 5px 12px;
  border-radius: 8px;
  font-size: 12.5px;
  font-weight: 600;
  cursor: pointer;
  border: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(248,113,113,0.4)' : 'rgba(220,38,38,0.35)'};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(248,113,113,0.12)' : 'rgba(220,38,38,0.06)'};
  color: ${({ theme }) => (theme.mode === 'dark' ? '#fca5a5' : '#dc2626')};
  transition: background 0.14s, border-color 0.14s;

  &:hover {
    background: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(248,113,113,0.2)' : 'rgba(220,38,38,0.1)'};
  }

  &:focus-visible {
    outline: none;
    box-shadow: ${BRAND.focusRing};
  }
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

  &:focus-visible {
    outline: none;
    box-shadow: ${BRAND.focusRing};
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

/**
 * 필터 결과 0건 시 fallback 추천 — 최근 본 사건 5개 노출.
 * 빈 상태가 죽은 화면이 되지 않도록 사용자 행동 단서 제공.
 */
const FallbackSection = styled.div`
  margin-top: 24px;
  padding-top: 20px;
  border-top: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(15,23,42,0.08)'};
  width: 100%;
  max-width: 480px;
`

const FallbackHeading = styled.h4`
  margin: 0 0 10px 0;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.02em;
  color: ${({ theme }) => theme.colors.text.tertiary};
  text-transform: uppercase;
`

const FallbackList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
`

const FallbackItem = styled.button`
  text-align: left;
  padding: 8px 10px;
  border: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(15,23,42,0.08)'};
  background: transparent;
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.12s, border-color 0.12s;

  &:hover {
    background: ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(255,255,255,0.04)'
        : 'rgba(15,23,42,0.03)'};
    border-color: rgba(37, 99, 235, 0.32);
  }
`

const FallbackTitle = styled.span`
  display: block;
  font-size: 13px;
  font-weight: 500;
  color: ${({ theme }) => theme.colors.text.primary};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`

// ─────────────────────────────────────────────────────────────────────────────
// Skeleton — 실제 timeline-stop 레이아웃과 동일 구조로 렌더되어,
// 로딩 → 실제 데이터 전환 시 시각 점프 없이 자연스러운 페인트 흐름 유지.
// ─────────────────────────────────────────────────────────────────────────────

const skeletonBarBg = css`
  background: linear-gradient(
    90deg,
    ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(147, 197, 253, 0.08)'
        : 'rgba(37, 99, 235, 0.08)'} 0%,
    ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(147, 197, 253, 0.15)'
        : 'rgba(37, 99, 235, 0.15)'} 50%,
    ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(147, 197, 253, 0.08)'
        : 'rgba(37, 99, 235, 0.08)'} 100%
  );
`

const SkeletonStop = styled.div<{ $depth: number }>`
  position: relative;
  display: flex;
  align-items: stretch;
  padding: 10px 12px 10px 14px;
  margin-left: ${({ $depth }) => $depth * 22}px;
  border-bottom: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(255, 255, 255, 0.05)'
        : 'rgba(15, 23, 42, 0.05)'};
`

const SkeletonRail = styled.span`
  position: absolute;
  left: calc(-1 * var(--rail-inset, 38px));
  top: 50%;
  transform: translate(-50%, -50%);
  width: 8px;
  height: 8px;
  border-radius: 50%;
  ${skeletonBarBg}
  ${shimmerAnimation}
  box-shadow: 0 0 0 2px
    ${({ theme }) => (theme.mode === 'dark' ? '#0f0f12' : '#ffffff')};
  z-index: 1;
`

/* 단일 행 — 실제 행([연도][카테고리칩][제목])과 동일 구조. */
const SkeletonBody = styled.div`
  flex: 1;
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 8px;
  min-width: 0;
  max-width: 880px;
`

const SkeletonYear = styled.span`
  width: 30px;
  height: 11px;
  border-radius: 4px;
  ${skeletonBarBg}
  ${shimmerAnimation}
  flex-shrink: 0;
`

const SkeletonCategory = styled.span`
  height: 16px;
  border-radius: 6px;
  ${skeletonBarBg}
  ${shimmerAnimation}
  opacity: 0.7;
  flex-shrink: 0;
`

const SkeletonTitleBar = styled.span`
  height: 14px;
  border-radius: 4px;
  ${skeletonBarBg}
  ${shimmerAnimation}
  max-width: 70%;
`
