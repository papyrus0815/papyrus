/**
 * Event Compact List Widget
 * FSD: widgets/event-list-compact/ui
 */
import React, { useMemo } from 'react'

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
import { useMediaQuery } from '@/shared/hooks/use-media-query.hook'
import { formatYearLabel, getCentury } from '@/shared/lib/iso-date'
import { pathKeys } from '@/shared/router'

import type {
  EventHierarchyNode,
  HistoricalEvent,
} from '../../../pages/events/create/events.types'
import * as List from '../../../pages/events/styles/list.styles'
import { shimmerAnimation } from '../../../pages/events/styles/shared.styles'
import { BRAND, metaText } from '../../../pages/events/styles/theme'
import {
  buildYearBuckets,
  groupYearsByCentury,
} from '@/features/event-hierarchy/model'
import type { FlattenedHierarchyItem } from '@/features/event-hierarchy/model'

import { EventListItem } from './event-list-item'

interface EventCompactListProps {
  isLoading: boolean
  /** 평탄화 계약은 useEventHierarchy가 단일 출처 — 여기서 재선언하면 필드가 표류한다 */
  flattenedHierarchy: FlattenedHierarchyItem[]
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
  /**
   * 표시 중인 행 가운데 *최상위* 사건 수 — 헤더의 '등록 N건'(최상위 기준)과 같은
   * 모수를 하단에도 함께 보여, 같은 화면에서 두 숫자가 모순돼 보이지 않게 한다.
   */
  displayedRootCount?: number
  hasMoreData?: boolean
  /** 이미 일부 로드된 뒤 다음 페이지 로드가 실패한 상태 — 하단 인라인 재시도 노출 */
  loadMoreFailed?: boolean
  onRetryLoadMore?: () => void
  bookmarks?: Set<string>
  /** 사용자 입력 검색어 — Title의 매칭 부분 강조에 사용 */
  searchQuery?: string
  /** 최근 본 사건 ID — 필터 결과 0건 빈 상태에서 fallback 추천으로 노출 */
  recentEventIds?: string[]
  /**
   * 세기·연도 밴드 접힘 — **페이지가 소유**한다(위젯 로컬 state 아님).
   * 위젯 로컬이던 시절엔 뷰를 바꿨다 돌아오면 언마운트로 접기 작업이 통째로 휘발했고,
   * 드로어 이전/다음이 접힌 밴드 안의 행까지 순회해 ↑↓ 키와 결과가 갈렸다(검토 INT-4/6).
   */
  collapsedYears: Set<number>
  collapsedCenturies: Set<number>
  onToggleYearCollapse: (year: number) => void
  onToggleCenturyCollapse: (century: number) => void
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
  displayedRootCount = 0,
  hasMoreData = false,
  loadMoreFailed = false,
  onRetryLoadMore,
  bookmarks = new Set(),
  searchQuery,
  recentEventIds = [],
  collapsedYears,
  collapsedCenturies,
  onToggleYearCollapse,
  onToggleCenturyCollapse,
  onToggleExpansion,
  onSelectEvent,
  onShowSummary,
  onResetFilters,
  onToggleBookmark,
  onScroll,
  pageSize = 20,
}) => {
  const navigate = useNavigate()
  /**
   * 좁은 폭 판정을 **목록에서 한 번만** 한다. 행마다 useMediaQuery를 부르면 렌더된 행 수
   * (수백 개)만큼 matchMedia 리스너가 생긴다. 임계값은 행 스타일의 미디어쿼리와 동일하게 640px.
   */
  const isNarrow = useMediaQuery('(max-width: 640px)')

  /** id→event O(1) 조회 — 행마다 events.find로 선형 탐색하던 핫패스 제거 */
  const eventById = useMemo(() => {
    const byId = new Map<string, HistoricalEvent>()
    for (const historicalEvent of events) byId.set(historicalEvent.id, historicalEvent)
    return byId
  }, [events])

  /**
   * 세기›연도 그룹핑 — 계산은 features/event-hierarchy의 공유 함수가 담당한다.
   * 페이지도 같은 함수로 '보이는 행'을 계산해 드로어 이전/다음과 ↑↓ 키가 화면과
   * 어긋나지 않게 한다(검토 INT-4).
   */
  const { allYears, eventsByYear, centuryCount, unknownItems } = useMemo(
    () => buildYearBuckets(flattenedHierarchy, sortDirection),
    [flattenedHierarchy, sortDirection],
  )

  /**
   * 세기 → 그 세기에 속한 연도들. 렌더 트리를 `CenturySection > YearSection > 행`으로
   * 만들기 위한 그룹핑이다.
   *
   * 이전엔 연도 배열을 평면으로 돌면서 "세기가 바뀌면 헤더를 끼워 넣는" 방식이라
   * 세기·연도 헤더가 스크롤 컨테이너의 직접 자식이 됐다. 그러면 sticky의 containing
   * block이 목록 전체가 되어 **지나간 헤더가 하나도 밀려나지 않고 계속 쌓인다**
   * (실측: scrollTop 6000에서 연도 헤더 34개가 동시에 같은 자리에 stuck).
   * 그룹을 실제 박스로 감싸면 그룹이 끝날 때 헤더도 함께 밀려난다.
   */
  const centuryGroups = useMemo(() => groupYearsByCentury(allYears), [allYears])

  /**
   * 로빙 tabindex의 대상 행 id.
   *
   * 예전엔 **모든 행이 tabIndex=0**이라 목록에 238개의 탭 정지점이 생겼다 —
   * 실측상 헤더·툴바를 지나 목록에 진입하는 데만 Tab 22회가 필요했고, 목록 아래 컨트롤로
   * 넘어가려면 238번을 더 눌러야 했다(검토 A11Y-7). 목록 전체는 탭 정지점 **하나**만 갖고,
   * 그 안에서는 ↑↓로 이동하는 것이 리스트박스/그리드의 표준 규약이다.
   * 선택된 행이 있으면 그 행, 없으면 첫 행이 진입점이 된다.
   */
  const rovingRowId =
    (selectedEventId &&
      flattenedHierarchy.some((item) => item.node.id === selectedEventId) &&
      selectedEventId) ||
    flattenedHierarchy[0]?.node.id ||
    null

  /** 행 하나 렌더 — 연도 섹션과 '연도 미상' 섹션이 같은 계약을 공유한다. */
  const renderRow = (
    {
      node,
      depth,
      parentEvent,
      hiddenChildCount,
      isMatch,
      canExpand,
    }: FlattenedHierarchyItem,
    groupYear: number | null,
    positionInSet: number,
    setSize: number,
  ) => {
    const event = eventById.get(node.id) ?? parentEvent
    if (!event) return null
    return (
      <EventListItem
        key={node.id}
        node={node}
        event={event}
        depth={depth}
        isExpanded={expandedEventIds.has(node.id)}
        // 평탄화가 알려주는 값을 그대로 쓴다 — 자식 수로 추측하면 평면 모드에서
        // 눌러도 아무 일이 없는 셰브론이 그려진다.
        hasChildren={canExpand}
        childCount={canExpand ? (node.children?.length ?? 0) : 0}
        hiddenChildCount={hiddenChildCount}
        isMatch={isMatch}
        isActive={selectedEventId === node.id}
        dbCategories={dbCategories}
        isBookmarked={bookmarks.has(node.id)}
        searchQuery={searchQuery}
        // 이 행이 속한 연 그룹 — 같은 해면 선두 토큰을 월·일로 대체(연도 중복 제거)
        groupYear={groupYear}
        isNarrow={isNarrow}
        // 계층 깊이를 접근성 트리에 전달 — 예전엔 하위 사건이 최상위와 똑같이 읽혔다.
        ariaLevel={depth + 1}
        positionInSet={positionInSet}
        setSize={setSize}
        // 목록 전체가 탭 정지점 하나만 갖도록(로빙 tabindex)
        isRovingTarget={node.id === rovingRowId}
        // 안정 참조 전달 — 행마다 새 화살표를 만들지 않아 EventListItem의
        // React.memo가 실효. id는 EventListItem이 node.id로 직접 전달.
        onSelect={onSelectEvent}
        onToggleExpansion={onToggleExpansion}
        onShowSummary={onShowSummary}
        onToggleBookmark={onToggleBookmark}
      />
    )
  }

  return (
    <List.CatalogSection>
      {isLoading ? (
        <List.CompactList>
          {[...Array(Math.min(pageSize, 12))].map((_, index) => {
            // 실제 행(단일 행: 레일 dot + [연도][카테고리칩][제목])과 동일 구조로 렌더 →
            // 로딩→데이터 전환 시 높이·요소 위치 점프 없음.
            // 동일 폭 반복 회피 — index 기반 폭으로 자연스러운 다양성
            const titleW = 40 + ((index * 13) % 30) // 40~70%
            const categoryW = 40 + ((index * 7) % 24) // 40~64px
            return (
              /* $depth 0 고정 — 예전엔 index % 3으로 인위적 계단 들여쓰기를 그려,
                 데이터가 도착하면 그 계단이 평평해지며 레이아웃이 한 번 무너졌다 잡혔다. */
              <SkeletonStop key={index} $depth={0}>
                <SkeletonRail aria-hidden="true" />
                <SkeletonBody>
                  {/* 실제 행의 20px 셰브론/스페이서 자리 — 없으면 데이터 도착 시 가로 28px 이동 */}
                  <SkeletonExpandSpacer aria-hidden="true" />
                  <SkeletonYear />
                  <SkeletonCategory style={{ width: `${categoryW}px` }} />
                  <SkeletonTitleBar style={{ width: `${titleW}%` }} />
                </SkeletonBody>
              </SkeletonStop>
            )
          })}
        </List.CompactList>
      ) : flattenedHierarchy.length === 0 && (isLoadingMore || hasMoreData) ? (
        /**
         * 아직 받아올 페이지가 남았는데 현재 창에 결과가 0건인 상태.
         *
         * 예전엔 곧장 '현재 조건과 일치하는 사건이 없습니다'를 확정 표시했다. 카탈로그는
         * autoLoadAll로 전 페이지를 순차 소진하고 1000년 이전 사건은 서버 정렬상 마지막
         * 페이지에 몰리므로, 옛 사건을 찾는 필터에서 **아직 오지 않았을 뿐인데 없다고
         * 단정**하는 창이 실제로 존재했다(검토 DATA-12).
         */
        <List.EmptyCatalogState>
          <List.EmptyIcon>
            <List.LoadingSpinner />
          </List.EmptyIcon>
          <List.EmptyContent>
            <List.EmptyTitle>사건을 불러오는 중입니다</List.EmptyTitle>
            <List.EmptyDescription>
              전체 사건을 다 받은 뒤에 조건에 맞는 결과를 보여드립니다.
            </List.EmptyDescription>
          </List.EmptyContent>
        </List.EmptyCatalogState>
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
                  <ActiveChip
                    key={chip.key}
                    type="button"
                    // 라벨만 두면 '정치'로 읽혀 해제 버튼인지 전달되지 않는다.
                    aria-label={`${chip.label} 필터 해제`}
                    onClick={chip.onClear}
                  >
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
        <List.CompactList onScroll={onScroll} aria-busy={isLoadingMore}>
          {/*
           * 목록 규모 고지 — 예전엔 스크롤 컨테이너의 정적 aria-label이었다.
           * ⑴ role="list"를 컨테이너에 두면 자식으로 listitem만 허용되는데 세기·연도 접기
           *    버튼이 직속 자식이라 구조가 부적법했고(실측: 직속 자식 333개 중 버튼 99개),
           * ⑵ 정적 label이라 세기·연도를 접어 행이 줄어도 값이 그대로였다(검토 A11Y-12).
           * 라이브 영역으로 옮겨 변화가 실제로 낭독되게 한다.
           */}
          <List.GroupHeading as="p" role="status" aria-live="polite">
            {`사건 목록 — 표시 ${displayedCount.toLocaleString()}행, 최상위 ${displayedRootCount.toLocaleString()}건`}
          </List.GroupHeading>
          {centuryGroups.map(({ century, years }) => {
            const isCenturyCollapsed = collapsedCenturies.has(century)

            // 세기 라벨/범위 — getCentury 정의(양수 ceil, 음수 BC)에 맞춰 BC 안전.
            // 양수 c: (c-1)*100+1 ~ c*100 (예: 20세기 → 1901~2000, 1세기 → 1~100)
            // 음수 c(BC): |c|세기 = (|c|-1)*100+1 ~ |c|*100 BC
            const absCentury = Math.abs(century)
            const centuryLabel =
              century < 0 ? `기원전 ${absCentury}세기` : `${century}세기`
            const centuryRangeFrom =
              absCentury === 1 ? 1 : (absCentury - 1) * 100 + 1
            const centuryRangeTo = absCentury * 100
            const centuryRangeLabel =
              century < 0
                ? `기원전 ${centuryRangeTo}–${centuryRangeFrom}`
                : `${centuryRangeFrom}–${centuryRangeTo}`

            const centuryHeadingId = `events-century-${century}`
            return (
              <List.CenturySection
                key={`century-${century}`}
                role="group"
                aria-labelledby={centuryHeadingId}
              >
                {/* 헤딩 탐색용 — 시각적으로는 숨기고 접근성 트리에만 남긴다. */}
                <List.GroupHeading id={centuryHeadingId} aria-level={3}>
                  {`${centuryLabel} (${centuryRangeLabel}) — 사건 ${centuryCount.get(century) ?? 0}건`}
                </List.GroupHeading>
                <List.CenturyDivider
                  type="button"
                  aria-expanded={!isCenturyCollapsed}
                  aria-label={`${centuryLabel} — 사건 ${centuryCount.get(century) ?? 0}건 ${
                    isCenturyCollapsed ? '펼치기' : '접기'
                  }`}
                  onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                    e.preventDefault()
                    onToggleCenturyCollapse(century)
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

                {/* 세기 접힘 → 그 세기 안의 연도 섹션을 통째로 렌더하지 않는다(헤더만 남음) */}
                {isCenturyCollapsed
                  ? null
                  : years.map((currentYear) => {
                      const yearItems = eventsByYear.get(currentYear) ?? []
                      const yearEventCount = yearItems.filter(
                        (item) => item.depth === 0,
                      ).length
                      const isYearCollapsed = collapsedYears.has(currentYear)

                      const yearHeadingId = `events-year-${currentYear}`
                      return (
                        <List.YearSection
                          key={`year-${currentYear}`}
                          role="group"
                          aria-labelledby={yearHeadingId}
                        >
                          <List.GroupHeading id={yearHeadingId} aria-level={4}>
                            {`${formatYearLabel(currentYear)} — 사건 ${yearEventCount}건`}
                          </List.GroupHeading>
                          <List.YearDivider
                            type="button"
                            aria-expanded={!isYearCollapsed}
                            aria-label={`${formatYearLabel(currentYear)} — 사건 ${yearEventCount}건 ${
                              isYearCollapsed ? '펼치기' : '접기'
                            }`}
                            onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                              e.preventDefault()
                              onToggleYearCollapse(currentYear)
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
                              {formatYearLabel(currentYear)}
                              <List.CollapsedCount>
                                {yearEventCount}
                              </List.CollapsedCount>
                            </span>
                          </List.YearDivider>
                          {isYearCollapsed ? (
                            <List.CollapsedPlaceholder>
                              <span>
                                {/* 접기가 실제로 숨기는 것은 **렌더되던 행 전체**(하위 사건 포함)다.
                                    yearEventCount(depth 0만)를 쓰면 '2개 사건이 접혀있습니다'라며
                                    7행이 사라져 숫자가 화면과 어긋난다. */}
                                {yearItems.length > 0
                                  ? `${yearItems.length}행이 접혀있습니다`
                                  : formatYearLabel(currentYear)}
                              </span>
                            </List.CollapsedPlaceholder>
                          ) : (
                            <List.RowList
                              role="list"
                              aria-labelledby={yearHeadingId}
                            >
                              {yearItems.map((item, index) =>
                                renderRow(item, currentYear, index, yearItems.length),
                              )}
                            </List.RowList>
                          )}
                        </List.YearSection>
                      )
                    })}
              </List.CenturySection>
            )
          })}

          {/* 연도 미상 — period.start가 비었거나 파싱 불가하고 귀속할 상위 연도도 없는 항목.
           * 그룹핑에서 드롭하지 않고 여기 모아 렌더한다(자식만 남은 북마크 필터·날짜 완전 미상). */}
          {unknownItems.length > 0 && (
            /* 연도 섹션과 같은 래퍼를 쓴다 — UnknownYearDivider도 YearDivider를 상속해
             * sticky이므로, 감싸지 않으면 이 헤더만 목록 끝까지 상단에 눌어붙는다. */
            <List.YearSection
              key="year-unknown"
              role="group"
              aria-labelledby="events-year-unknown"
            >
              <List.GroupHeading id="events-year-unknown" aria-level={4}>
                {`연도 미상 — 사건 ${unknownItems.length}건`}
              </List.GroupHeading>
              <List.UnknownYearDivider as="div" style={{ cursor: 'default' }}>
                <span>
                  연도 미상
                  <List.CollapsedCount>{unknownItems.length}</List.CollapsedCount>
                </span>
              </List.UnknownYearDivider>
              <List.RowList role="list" aria-labelledby="events-year-unknown">
                {unknownItems.map((item, index) =>
                  renderRow(item, null, index, unknownItems.length),
                )}
              </List.RowList>
            </List.YearSection>
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
                끝까지 봤습니다 · 표시 {displayedCount.toLocaleString()}행
                {displayedRootCount > 0 &&
                  displayedRootCount !== displayedCount &&
                  ` (최상위 ${displayedRootCount.toLocaleString()}건)`}
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
  color: ${metaText};
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
  color: ${metaText};
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
  color: ${metaText};
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
  /* 실제 행 높이(45px)와 동기화 — 예전엔 33px이라 12행 기준 세로 ~144px이 점프했다.
     실제 행에는 28px BookmarkBtn이 상시 렌더되므로 그 높이가 하한이다. */
  box-sizing: border-box;
  min-height: 45px;
  padding: 8px 12px 8px 14px;
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

const SkeletonExpandSpacer = styled.span`
  width: 20px;
  height: 20px;
  flex-shrink: 0;
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
