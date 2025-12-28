/**
 * Event List Item Widget
 * FSD: widgets/event-list-compact/ui
 */

import React from 'react'
import { FiChevronDown, FiChevronRight, FiGitBranch } from 'react-icons/fi'

import { getCategoryName } from '@/features/event-list/lib'
import type { EventCategoryDto } from '@/shared/api/event-categories'

import type {
  EventHierarchyNode,
  HistoricalEvent,
} from '../../../pages/events/create/events.types'
import * as List from '../../../pages/events/styles/list.styles'
import * as Modal from '../../../pages/events/styles/modal.styles'

interface EventListItemProps {
  node: EventHierarchyNode
  event: HistoricalEvent
  depth: number
  isExpanded: boolean
  hasChildren: boolean
  isActive: boolean
  isInTenureGroup: boolean
  dbCategories: EventCategoryDto[]
  onSelect: () => void
  onToggleExpansion: () => void
  onShowSummary: () => void
}

export const EventListItem: React.FC<EventListItemProps> = ({
  node,
  event,
  depth,
  isExpanded,
  hasChildren,
  isActive,
  isInTenureGroup,
  dbCategories,
  onSelect,
  onToggleExpansion,
  onShowSummary,
}) => {
  const formatFullDate = (date: Date) => {
    return `${date.getFullYear()}년 ${date.getMonth() + 1}월 ${date.getDate()}일`
  }

  const formatPeriod = () => {
    const start = new Date(node.period.start)
    const end = node.period.end ? new Date(node.period.end) : null

    if (!end || start.getTime() === end.getTime()) {
      return formatFullDate(start)
    }

    const diffTime = Math.abs(end.getTime() - start.getTime())
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

    return `${formatFullDate(start)} ~ ${formatFullDate(end)} (${diffDays}일)`
  }

  const ListItemComponent = isInTenureGroup
    ? List.CompactListItemInTenure
    : List.CompactListItem

  return (
    <ListItemComponent
      $active={isActive}
      $depth={depth}
      type="button"
      onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
        e.stopPropagation()
        onSelect()
      }}
    >
      <List.CompactListBody>
        <List.CompactThumbnail
          $depth={depth}
          $isEmpty={!event.visuals.thumbnailUrl}
          style={
            event.visuals.thumbnailUrl
              ? {
                  backgroundImage: `url(${event.visuals.thumbnailUrl})`,
                }
              : undefined
          }
        >
          {event.visuals.thumbnailUrl && (
            <List.CompactCategoryBadge $category={event.category}>
              {getCategoryName(event.category, dbCategories)}
            </List.CompactCategoryBadge>
          )}
        </List.CompactThumbnail>
        <List.CompactListContent>
          <List.CompactListHeader>
            {hasChildren ? (
              <List.ExpandButton
                type="button"
                onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                  e.stopPropagation()
                  onToggleExpansion()
                }}
              >
                {isExpanded ? (
                  <FiChevronDown size={14} />
                ) : (
                  <FiChevronRight size={14} />
                )}
              </List.ExpandButton>
            ) : (
              <List.ExpandSpacer />
            )}
            <List.CompactCategoryDot $category={event.category} $depth={depth} />
            <List.CompactListTitle>
              {node.title}
              {hasChildren && depth === 0 && (
                <Modal.SummaryIconButton
                  type="button"
                  onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                    e.stopPropagation()
                    onShowSummary()
                  }}
                  title="사건 요약 보기"
                >
                  <FiGitBranch size={13} />
                </Modal.SummaryIconButton>
              )}
            </List.CompactListTitle>
          </List.CompactListHeader>
          <List.CompactListMeta $depth={depth}>
            <span>{formatPeriod()}</span>
            {node.importance === 'critical' && (
              <>
                <span>·</span>
                <List.ImportanceBadge>핵심</List.ImportanceBadge>
              </>
            )}
            {node.importance === 'major' && (
              <>
                <span>·</span>
                <List.ImportanceBadge $major>주요</List.ImportanceBadge>
              </>
            )}
          </List.CompactListMeta>
          <List.CompactListSummary $depth={depth}>
            {node.summary}
          </List.CompactListSummary>
        </List.CompactListContent>
      </List.CompactListBody>
    </ListItemComponent>
  )
}

