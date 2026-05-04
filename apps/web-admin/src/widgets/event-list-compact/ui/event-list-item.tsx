/**
 * Event List Item — Timeline stop 형태 (2단 구성).
 * FSD: widgets/event-list-compact/ui
 *
 * 디자인 원칙
 *  - "카드 박스" 아님. 좌측 레일(left:32px in CompactList)에 dot로 점찍힌 *시간축의 정거장*.
 *  - **2단 구성**: 1행은 시각 1순위(연도·제목·중요도), 2행은 메타(카테고리·기간·국기·액션).
 *    이전 단일 행 9요소 → 시선이 안정되고 우측 가장자리 충돌 해소.
 *  - **중요도는 색이 아닌 별(★)** — 카테고리 색·active 색과 충돌 방지.
 *    critical=★★★, major=★★, normal=무표시.
 *  - depth > 0 (하위 사건)는 들여쓰기 + 더 긴 레일 connector.
 */
import React from 'react'

import { FiBookmark, FiChevronRight, FiGitBranch } from 'react-icons/fi'
import styled, { css } from 'styled-components'

import { getCategoryName } from '@/features/event-list/lib'
import type { EventCategoryDto } from '@/shared/api/event-categories'
import { CountryFlags } from '@/shared/ui/country-flags/country-flags'

import { CATEGORY_BADGE_COLORS } from '../../../pages/events/styles/theme'
import type {
  EventHierarchyNode,
  HistoricalEvent,
} from '../../../pages/events/create/events.types'

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

type ImportanceTier = 'critical' | 'major' | 'normal'

const tierFromNode = (
  importance: EventHierarchyNode['importance'] | undefined,
): ImportanceTier => {
  if (importance === 'critical') return 'critical'
  if (importance === 'major') return 'major'
  return 'normal'
}

const formatDuration = (start: Date, end: Date | null) => {
  if (!end || start.getTime() === end.getTime()) return '1일'
  const diffDays = Math.ceil(
    Math.abs(end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24),
  )
  if (diffDays >= 365) {
    const years = Math.floor(diffDays / 365)
    const remDays = diffDays % 365
    const months = Math.floor(remDays / 30)
    if (months > 0) return `${years}년 ${months}개월`
    return `${years}년`
  }
  if (diffDays >= 30) {
    const months = Math.floor(diffDays / 30)
    const days = diffDays % 30
    return days > 0 ? `${months}개월 ${days}일` : `${months}개월`
  }
  return `${diffDays}일`
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
  const tier = tierFromNode(node.importance)
  const start = new Date(node.period.start)
  const end = node.period.end ? new Date(node.period.end) : null
  const startYear = start.getFullYear()
  const duration = formatDuration(start, end)
  const categoryName = getCategoryName(event.category, dbCategories)
  const categoryColor =
    CATEGORY_BADGE_COLORS[
      event.category as keyof typeof CATEGORY_BADGE_COLORS
    ] ?? '#2563eb'

  return (
    <Stop
      $active={isActive}
      $depth={depth}
      $tier={tier}
      $tenure={isInTenureGroup}
      $categoryColor={categoryColor}
      onClick={onSelect}
      data-event-id={node.id}
      data-active={isActive ? 'true' : undefined}
    >
      <Body>
        <Row1>
          {hasChildren ? (
            <ExpandBtn
              type="button"
              onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                e.stopPropagation()
                onToggleExpansion()
              }}
              $expanded={isExpanded}
              aria-label={isExpanded ? '접기' : '하위 사건 펼치기'}
            >
              <FiChevronRight size={11} />
            </ExpandBtn>
          ) : (
            <ExpandSpacer />
          )}

          <Year $tier={tier}>{startYear}</Year>
          <Title $tier={tier}>{node.title}</Title>

          {tier !== 'normal' && (
            <ImportanceStars
              $tier={tier}
              role="img"
              aria-label={tier === 'critical' ? '핵심 사건' : '주요 사건'}
              title={tier === 'critical' ? '핵심 사건' : '주요 사건'}
            >
              {tier === 'critical' ? '★★★' : '★★'}
            </ImportanceStars>
          )}

          <RowActions>
            {hasChildren && depth === 0 && (
              <IconBtn
                type="button"
                onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                  e.stopPropagation()
                  onShowSummary()
                }}
                title="사건 요약 보기"
                aria-label="사건 요약 보기"
              >
                <FiGitBranch size={12} />
              </IconBtn>
            )}
            {onToggleBookmark && (
              <BookmarkBtn
                type="button"
                onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                  e.stopPropagation()
                  onToggleBookmark()
                }}
                $bookmarked={isBookmarked}
                title={isBookmarked ? '즐겨찾기 해제' : '즐겨찾기 추가'}
                aria-label={isBookmarked ? '즐겨찾기 해제' : '즐겨찾기 추가'}
              >
                <FiBookmark
                  size={13}
                  fill={isBookmarked ? 'currentColor' : 'none'}
                />
              </BookmarkBtn>
            )}
          </RowActions>
        </Row1>

        <Row2>
          <CategoryDot
            style={{ background: categoryColor }}
            aria-hidden="true"
          />
          <CategoryLabel>{categoryName}</CategoryLabel>
          <MetaSep aria-hidden="true">·</MetaSep>
          <Duration>{duration}</Duration>
          <Flags>
            <CountryFlags
              modern={event.relatedCountries}
              historical={event.relatedHistoricalCountries}
              max={3}
              size="sm"
            />
          </Flags>
        </Row2>
      </Body>
    </Stop>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// styled — Timeline stop (2-row)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * 타임라인 정거장(row) — 2단 구성 컨테이너.
 * - 좌측 레일(CompactList의 left:32px)에 dot + connector를 ::before/::after로 그림.
 * - depth>0 행은 들여쓰기되며 connector가 길어져 들여쓴 양만큼 확장.
 * - tenure 그룹 내에서는 미세한 bg tint로 묶음 시각화.
 * - active state: **좌측 4px 색 막대 + 미세 bg tint**(색 신호 단일화).
 */
const Stop = styled.div<{
  $active: boolean
  $depth: number
  $tier: ImportanceTier
  $tenure: boolean
  $categoryColor: string
}>`
  position: relative;
  display: flex;
  align-items: stretch;
  padding: 10px 12px 10px 14px;
  margin-left: ${({ $depth }) => $depth * 22}px;
  cursor: pointer;
  font-variant-numeric: tabular-nums;
  transition: background 0.14s ease;

  /* 사건 단위 분리 — hairline bottom border. 마지막 행은 자동 제거.
   * YearDivider/CenturyDivider 직전 Stop도 border-bottom 제거(:has(+ button)):
   * divider 자신이 border-top hairline을 그어 트리플 라인 회피. */
  border-bottom: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(255, 255, 255, 0.05)'
        : 'rgba(15, 23, 42, 0.05)'};

  &:last-of-type,
  &:has(+ button) {
    border-bottom: none;
  }

  /* 활성 상태 좌측 인디고 막대 + 우측 라운드 — 평면 hairline 안에서도 인지 명확. */
  border-radius: ${({ $active }) => ($active ? '6px' : '0')};
  ${({ $active }) =>
    $active &&
    css`
      box-shadow: inset 3px 0 0 0 #2563eb;
      border-bottom-color: transparent;
    `}

  /* 레일 → 행 dashed connector. 레일 위치(left: -38)에서 행 좌측 edge(0)까지. */
  &::before {
    content: '';
    position: absolute;
    left: ${({ $depth }) => -38 - $depth * 22}px;
    top: 50%;
    width: ${({ $depth }) => 38 + $depth * 22}px;
    height: 1px;
    border-top: 1px dashed
      ${({ theme }) =>
        theme.mode === 'dark'
          ? 'rgba(147, 197, 253, 0.28)'
          : 'rgba(37, 99, 235, 0.28)'};
    pointer-events: none;
  }

  /* 레일 위 도트 — 시간축의 정거장.
   *
   * 색 신호 단일화: 도트는 항상 **카테고리 색**(active와도 색 충돌 없음).
   * importance는 도트 *크기*(7/9/11px)와 별(★) 글리프로만 표현.
   * active는 외곽 indigo ring + 흰 가운데로 카테고리 색과 색 충돌 없이 분리. */
  &::after {
    content: '';
    position: absolute;
    left: ${({ $depth }) => -38 - $depth * 22}px;
    top: 50%;
    transform: translate(-50%, -50%);
    width: ${({ $active, $tier }) =>
      $active ? '11px' : $tier === 'critical' ? '9px' : '7px'};
    height: ${({ $active, $tier }) =>
      $active ? '11px' : $tier === 'critical' ? '9px' : '7px'};
    background: ${({ $active, theme, $categoryColor }) =>
      $active
        ? theme.mode === 'dark'
          ? '#0f0f12'
          : '#ffffff'
        : $categoryColor};
    border: ${({ $active }) =>
      $active ? '2px solid #2563eb' : 'none'};
    border-radius: 50%;
    box-shadow: 0 0 0 2px
      ${({ theme }) => (theme.mode === 'dark' ? '#0f0f12' : '#ffffff')};
    z-index: 1;
    transition: background 0.14s ease, width 0.14s ease, height 0.14s ease,
      border 0.14s ease;
  }

  /* tier별 / active별 bg tint — 단계 분리 분명히 */
  ${({ $active, $tenure, theme }) => {
    const isDark = theme.mode === 'dark'
    if ($active) {
      return css`
        background: ${isDark
          ? 'rgba(37, 99, 235, 0.12)'
          : 'rgba(37, 99, 235, 0.06)'};
      `
    }
    if ($tenure) {
      /* tenure 그룹 bg를 인지 가능한 수준으로 강화. 이전 0.015는 거의 안 보였음. */
      return css`
        background: ${isDark
          ? 'rgba(147, 197, 253, 0.04)'
          : 'rgba(37, 99, 235, 0.025)'};
      `
    }
    return css`
      background: transparent;
    `
  }}

  &:hover {
    background: ${({ theme, $active }) =>
      $active
        ? theme.mode === 'dark'
          ? 'rgba(37, 99, 235, 0.18)'
          : 'rgba(37, 99, 235, 0.10)'
        : theme.mode === 'dark'
          ? 'rgba(255, 255, 255, 0.04)'
          : 'rgba(15, 23, 42, 0.03)'};
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
    &::after {
      transition: none;
    }
  }
`

const Body = styled.div`
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 3px;
`

const Row1 = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
`

const Row2 = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
  padding-left: 24px; /* ExpandBtn 16 + gap 8 */
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const RowActions = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 2px;
  margin-left: auto;
  flex-shrink: 0;
`

const ExpandBtn = styled.button<{ $expanded: boolean }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  padding: 0;
  border: none;
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(15,23,42,0.04)'};
  border-radius: 4px;
  color: ${({ theme }) => theme.colors.text.secondary};
  cursor: pointer;
  flex-shrink: 0;
  transition: background 0.12s, transform 0.15s;
  transform: rotate(${({ $expanded }) => ($expanded ? 90 : 0)}deg);
  &:hover {
    background: rgba(37, 99, 235, 0.16);
    color: #2563eb;
  }
`

const ExpandSpacer = styled.span`
  width: 16px;
  height: 16px;
  flex-shrink: 0;
`

const Year = styled.span<{ $tier: ImportanceTier }>`
  font-size: ${({ $tier }) =>
    $tier === 'critical' ? '13px' : $tier === 'major' ? '12.5px' : '12px'};
  font-weight: 700;
  letter-spacing: -0.01em;
  color: ${({ theme }) => theme.colors.text.secondary};
  flex-shrink: 0;
  min-width: 36px;
`

const Title = styled.span<{ $tier: ImportanceTier }>`
  flex: 1;
  min-width: 0;
  font-size: ${({ $tier }) =>
    $tier === 'critical' ? '14px' : $tier === 'major' ? '13.5px' : '13px'};
  font-weight: ${({ $tier }) =>
    $tier === 'critical' ? 700 : $tier === 'major' ? 600 : 500};
  letter-spacing: -0.01em;
  line-height: 1.3;
  color: ${({ theme }) => (theme.mode === 'dark' ? '#f1f5f9' : '#0f172a')};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`

/* importance — 색 신호 사용 안 함. 별 글리프로만 위계 표현. */
const ImportanceStars = styled.span<{ $tier: ImportanceTier }>`
  display: inline-flex;
  align-items: center;
  flex-shrink: 0;
  font-size: 9.5px;
  letter-spacing: 0.5px;
  font-weight: 700;
  color: ${({ theme, $tier }) =>
    $tier === 'critical'
      ? theme.mode === 'dark'
        ? '#cbd5e1'
        : '#475569'
      : theme.mode === 'dark'
        ? 'rgba(203, 213, 225, 0.7)'
        : '#94a3b8'};
`

const CategoryDot = styled.span`
  width: 6px;
  height: 6px;
  border-radius: 50%;
  flex-shrink: 0;
`

const CategoryLabel = styled.span`
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.01em;
  color: ${({ theme }) => theme.colors.text.tertiary};
  flex-shrink: 0;
`

const MetaSep = styled.span`
  opacity: 0.4;
  font-size: 11px;
  user-select: none;
`

const Duration = styled.span`
  font-size: 11px;
  font-weight: 500;
  letter-spacing: -0.005em;
  color: ${({ theme }) => theme.colors.text.tertiary};
  flex-shrink: 0;

  @media (max-width: 600px) {
    display: none;
  }
`

const Flags = styled.span`
  display: inline-flex;
  align-items: center;
  margin-left: 4px;
  flex-shrink: 0;
`

const IconBtn = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  padding: 0;
  border: none;
  background: transparent;
  border-radius: 4px;
  color: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.45)' : 'rgba(15,23,42,0.45)'};
  cursor: pointer;
  flex-shrink: 0;
  transition: background 0.12s, color 0.12s;

  &:hover {
    background: ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(255,255,255,0.06)'
        : 'rgba(15,23,42,0.05)'};
    color: ${({ theme }) =>
      theme.mode === 'dark' ? '#cbd5e1' : '#0f172a'};
  }
`

const BookmarkBtn = styled.button<{ $bookmarked: boolean }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  padding: 0;
  border: none;
  background: transparent;
  cursor: pointer;
  border-radius: 4px;
  color: ${({ theme, $bookmarked }) =>
    $bookmarked
      ? '#f59e0b'
      : theme.mode === 'dark'
        ? 'rgba(255,255,255,0.32)'
        : 'rgba(15,23,42,0.32)'};
  transition: background 0.12s, color 0.12s;
  flex-shrink: 0;

  &:hover {
    background: ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(255,255,255,0.06)'
        : 'rgba(15,23,42,0.05)'};
    color: ${({ $bookmarked }) => ($bookmarked ? '#d97706' : '#f59e0b')};
  }
`
