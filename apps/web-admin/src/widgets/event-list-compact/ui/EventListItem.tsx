/**
 * Event List Item Widget - 정보 풍부하게 개편
 * FSD: widgets/event-list-compact/ui
 */
import React from 'react'

import {
  FiBookOpen,
  FiChevronDown,
  FiChevronRight,
  FiGitBranch,
  FiGlobe,
  FiMapPin,
  FiTag,
  FiUsers,
} from 'react-icons/fi'

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
  isBookmarked?: boolean
  onSelect: () => void
  onToggleExpansion: () => void
  onShowSummary: () => void
  onToggleBookmark?: () => void
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
  isBookmarked = false,
  onSelect,
  onToggleExpansion,
  onShowSummary,
  onToggleBookmark,
}) => {
  const formatFullDate = (date: Date) => {
    return `${date.getFullYear()}년 ${date.getMonth() + 1}월 ${date.getDate()}일`
  }

  const renderPeriod = () => {
    const start = new Date(node.period.start)
    const end = node.period.end ? new Date(node.period.end) : null

    if (!end || start.getTime() === end.getTime()) {
      return <span>{formatFullDate(start)}</span>
    }

    const diffTime = Math.abs(end.getTime() - start.getTime())
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

    const years = Math.floor(diffDays / 365)
    const remainingDaysAfterYears = diffDays % 365
    const months = Math.floor(remainingDaysAfterYears / 30)
    const days = remainingDaysAfterYears % 30

    const parts = []
    if (years > 0) parts.push(`${years}년`)
    if (months > 0) parts.push(`${months}개월`)
    if (days > 0 || parts.length === 0) parts.push(`${days}일`)
    const durationText = parts.join(' ')

    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
        }}
      >
        <div
          style={{
            fontSize: '11px',
            color: '#64748b',
          }}
        >
          {formatFullDate(start)} ~ {formatFullDate(end)}
        </div>
        <div
          style={{
            fontSize: '11px',
            fontWeight: '600',
            color: '#64748b',
            whiteSpace: 'nowrap',
          }}
        >
          {durationText}
        </div>
      </div>
    )
  }

  const ListItemComponent = isInTenureGroup
    ? List.CompactListItemInTenure
    : List.CompactListItem

  return (
    <ListItemComponent
      $active={isActive}
      $depth={depth}
      onClick={onSelect}
      data-event-id={node.id}
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
          <List.CompactCategoryBadge $category={event.category}>
            {getCategoryName(event.category, dbCategories)}
          </List.CompactCategoryBadge>
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
            <List.CompactCategoryDot
              $category={event.category}
              $depth={depth}
            />
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
              {onToggleBookmark && (
                <button
                  type="button"
                  onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                    e.stopPropagation()
                    onToggleBookmark()
                  }}
                  style={{
                    border: 'none',
                    background: 'transparent',
                    padding: '4px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    color: isBookmarked ? '#f59e0b' : '#cbd5e1',
                    fontSize: '16px',
                    transition: 'all 0.2s ease',
                    marginLeft: 'auto',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'scale(1.2)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'scale(1)'
                  }}
                  title={isBookmarked ? '즐겨찾기 해제' : '즐겨찾기 추가'}
                >
                  {isBookmarked ? '★' : '☆'}
                </button>
              )}
            </List.CompactListTitle>
          </List.CompactListHeader>

          <List.CompactListMeta $depth={depth}>
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                width: '100%',
              }}
            >
              {renderPeriod()}
              {(node.importance === 'critical' ||
                node.importance === 'major') && (
                <div
                  style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  {node.importance === 'critical' && (
                    <List.ImportanceBadge>핵심</List.ImportanceBadge>
                  )}
                  {node.importance === 'major' && (
                    <List.ImportanceBadge $major>주요</List.ImportanceBadge>
                  )}
                </div>
              )}
            </div>
          </List.CompactListMeta>

          {node.summary && (
            <List.CompactListSummary $depth={depth}>
              {node.summary}
            </List.CompactListSummary>
          )}

          {/* 추가 정보 - 한눈에 보기 */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
              marginTop: '8px',
              fontSize: '12px',
            }}
          >
            {/* 본문 구성 */}
            {event.sectionTitles && event.sectionTitles.length > 0 && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '6px',
                  color: '#64748b',
                }}
              >
                <FiBookOpen
                  size={13}
                  style={{ marginTop: '2px', flexShrink: 0 }}
                />
                <div style={{ flex: 1 }}>
                  <span style={{ fontWeight: 500 }}>본문:</span>{' '}
                  {event.sectionTitles.slice(0, 3).map((title, idx) => (
                    <span key={idx}>
                      {idx > 0 && ', '}
                      <span
                        style={{
                          background: '#f1f5f9',
                          padding: '1px 6px',
                          borderRadius: '3px',
                          color: '#475569',
                        }}
                      >
                        {title}
                      </span>
                    </span>
                  ))}
                  {event.sectionTitles.length > 3 && (
                    <span style={{ color: '#94a3b8' }}>
                      {' '}
                      외 {event.sectionTitles.length - 3}개
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* 키워드 */}
            {event.keywords && event.keywords.length > 0 && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '6px',
                  color: '#64748b',
                }}
              >
                <FiTag size={13} style={{ marginTop: '2px', flexShrink: 0 }} />
                <div
                  style={{
                    flex: 1,
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '4px',
                  }}
                >
                  {event.keywords.slice(0, 8).map((k, idx) => (
                    <span
                      key={idx}
                      style={{
                        background: '#e0e7ff',
                        padding: '2px 8px',
                        borderRadius: '10px',
                        fontSize: '11px',
                        color: '#4338ca',
                        fontWeight: '500',
                      }}
                    >
                      {k}
                    </span>
                  ))}
                  {event.keywords.length > 8 && (
                    <span style={{ color: '#94a3b8', fontSize: '11px' }}>
                      +{event.keywords.length - 8}
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* 관련 국가 */}
            {((event as any).relatedCountries?.length > 0 ||
              (event as any).relatedHistoricalCountries?.length > 0) && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '6px',
                  color: '#64748b',
                }}
              >
                <FiGlobe
                  size={13}
                  style={{ marginTop: '2px', flexShrink: 0 }}
                />
                <div
                  style={{
                    flex: 1,
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '4px',
                  }}
                >
                  {(event as any).relatedCountries?.map((country: any) => (
                    <span
                      key={country.id}
                      style={{
                        background: '#f1f5f9',
                        padding: '2px 8px',
                        borderRadius: '10px',
                        fontSize: '11px',
                        color: '#475569',
                        fontWeight: '500',
                      }}
                    >
                      {country.flagEmoji} {country.name}
                    </span>
                  ))}
                  {(event as any).relatedHistoricalCountries?.map(
                    (country: any) => (
                      <span
                        key={country.id}
                        style={{
                          background: '#fef3c7',
                          padding: '2px 8px',
                          borderRadius: '10px',
                          fontSize: '11px',
                          color: '#92400e',
                          fontWeight: '500',
                        }}
                      >
                        🏛️ {country.name}
                      </span>
                    ),
                  )}
                </div>
              </div>
            )}

            {/* 위치 */}
            {event.location && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  color: '#64748b',
                }}
              >
                <FiMapPin size={13} />
                <span>
                  <span style={{ fontWeight: 500 }}>위치:</span>{' '}
                  {event.location}
                </span>
              </div>
            )}

            {/* 참전국/사상자 (군사 카테고리) */}
            {event.category === 'military' &&
              event.stats.participatingNations > 0 && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    color: '#64748b',
                  }}
                >
                  <FiUsers size={13} />
                  <span>
                    <span style={{ fontWeight: 500 }}>참전국:</span>{' '}
                    {event.stats.participatingNations}개국
                    {event.stats.casualties.total > 0 && (
                      <>
                        , <span style={{ fontWeight: 500 }}>사상자:</span>{' '}
                        {event.stats.casualties.total.toLocaleString()}명
                      </>
                    )}
                  </span>
                </div>
              )}

            {/* 하위 사건 */}
            {hasChildren && node.children && node.children.length > 0 && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  color: '#64748b',
                }}
              >
                <FiGitBranch size={13} />
                <span>
                  <span style={{ fontWeight: 500 }}>하위 사건:</span>{' '}
                  {node.children.length}개
                </span>
              </div>
            )}
          </div>
        </List.CompactListContent>
      </List.CompactListBody>
    </ListItemComponent>
  )
}
