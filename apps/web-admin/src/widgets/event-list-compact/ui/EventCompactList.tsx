/**
 * Event Compact List Widget
 * FSD: widgets/event-list-compact/ui
 */

import React from 'react'
import { FiArrowDown, FiArrowUp, FiFilter, FiPlus, FiX } from 'react-icons/fi'
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
  TenureGroupHeader,
  OtherHeadsOfStateList,
  TenureGroupFooter,
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
  onToggleExpansion: (eventId: string) => void
  onToggleTenureGroupExpansion: (tenureKey: string) => void
  onSelectEvent: (eventId: string) => void
  onShowSummary: (eventId: string) => void
  onSortChange: (sortBy: SortOption) => void
  onSortDirectionToggle: () => void
  onResetFilters: () => void
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
  onToggleExpansion,
  onToggleTenureGroupExpansion,
  onSelectEvent,
  onShowSummary,
  onSortChange,
  onSortDirectionToggle,
  onResetFilters,
}) => {
  const navigate = useNavigate()

  return (
    <List.CatalogSection>
      <List.ResultControls>
        <List.ToolbarMeta>
          <span>{sortedEvents.length}건</span>
        </List.ToolbarMeta>
        <div style={{ display: 'flex', gap: '10px', marginLeft: 'auto' }}>
          <List.SortSelect
            value={sortBy}
            aria-label="정렬 기준 선택"
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
              onSortChange(e.target.value as SortOption)
            }
          >
            <option value="impact">파급력 높은 순</option>
            <option value="recent">최근 발생 순</option>
            <option value="duration">장기 지속 순</option>
          </List.SortSelect>
          <List.SortDirectionToggle type="button" onClick={onSortDirectionToggle}>
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
                onClick={() => navigate(pathKeys.history.eventsCreate())}
              >
                <FiPlus size={14} />새 사건 등록
              </List.EmptyCreateButton>
            )}
          </List.EmptyActions>
        </List.EmptyCatalogState>
      ) : (
        <List.CompactList>
          {flattenedHierarchy.map(({ node, depth, parentEvent }, index) => {
            const hasChildren = node.children && node.children.length > 0
            const isExpanded = expandedEventIds.has(node.id)
            const event = events.find((e) => e.id === node.id) ?? parentEvent

            if (!event) return null

            // 이 사건이 속한 집권 기간 그룹 찾기
            const tenureGroup =
              depth === 0
                ? tenureGroups.find((group) => group.eventIds.includes(node.id))
                : null

            // 이 사건이 그룹의 첫 번째/마지막 사건인지 확인
            const isGroupStart =
              tenureGroup &&
              tenureGroup.eventIds[0] === node.id &&
              depth === 0

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
        </List.CompactList>
      )}
    </List.CatalogSection>
  )
}

