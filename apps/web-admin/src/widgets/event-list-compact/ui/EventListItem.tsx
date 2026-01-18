/**
 * Event List Item Widget - 정보 풍부하게 개편
 * FSD: widgets/event-list-compact/ui
 */

import React from 'react'
import { FiChevronDown, FiChevronRight, FiGitBranch, FiBookOpen, FiMapPin, FiUsers } from 'react-icons/fi'

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

          {/* 추가 정보 - 한눈에 보기 */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '6px',
            marginTop: '8px',
            fontSize: '12px'
          }}>
            {/* 본문 구성 */}
            {event.sectionTitles && event.sectionTitles.length > 0 && (
              <div style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '6px',
                color: '#64748b'
              }}>
                <FiBookOpen size={13} style={{ marginTop: '2px', flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <span style={{ fontWeight: 500 }}>본문:</span>{' '}
                  {event.sectionTitles.slice(0, 3).map((title, idx) => (
                    <span key={idx}>
                      {idx > 0 && ', '}
                      <span style={{ 
                        background: '#f1f5f9',
                        padding: '1px 6px',
                        borderRadius: '3px',
                        color: '#475569'
                      }}>
                        {title}
                      </span>
                    </span>
                  ))}
                  {event.sectionTitles.length > 3 && (
                    <span style={{ color: '#94a3b8' }}> 외 {event.sectionTitles.length - 3}개</span>
                  )}
                </div>
              </div>
            )}

            {/* 위치 */}
            {event.location && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                color: '#64748b'
              }}>
                <FiMapPin size={13} />
                <span><span style={{ fontWeight: 500 }}>위치:</span> {event.location}</span>
              </div>
            )}

            {/* 참전국/사상자 (군사 카테고리) */}
            {event.category === 'military' && event.stats.participatingNations > 0 && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                color: '#64748b'
              }}>
                <FiUsers size={13} />
                <span>
                  <span style={{ fontWeight: 500 }}>참전국:</span> {event.stats.participatingNations}개국
                  {event.stats.casualties.total > 0 && (
                    <>, <span style={{ fontWeight: 500 }}>사상자:</span> {event.stats.casualties.total.toLocaleString()}명</>
                  )}
                </span>
              </div>
            )}

            {/* 하위 사건 */}
            {hasChildren && node.children && node.children.length > 0 && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                color: '#64748b'
              }}>
                <FiGitBranch size={13} />
                <span><span style={{ fontWeight: 500 }}>하위 사건:</span> {node.children.length}개</span>
              </div>
            )}
          </div>
        </List.CompactListContent>
      </List.CompactListBody>
    </ListItemComponent>
  )
}
