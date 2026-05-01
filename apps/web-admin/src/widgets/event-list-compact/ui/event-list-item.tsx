/**
 * Event List Item Widget — Row 기반 피드 스타일 (한눈 스캔용)
 * FSD: widgets/event-list-compact/ui
 *
 * 디자인 원칙
 *  - "카드 박스"가 아닌 "행(row)" — 박스/그림자 대신 하단 구분선으로 흐름.
 *  - 좌측 연도 칼럼이 시간 인덱스 역할 (큰 숫자, 기간은 작게).
 *  - 우측 mini sparkbar — 그 사건이 자기 세기에서 어디에 위치하는지 막대로.
 *  - importance에 따라 좌측 색 막대 두께 + 행 패딩 + 제목 크기 차등.
 *  - 상세(키워드·국가·하위 사건 등)는 우측 상세 패널로 위임.
 */
import React from 'react'

import { FiBookmark, FiChevronRight, FiGitBranch } from 'react-icons/fi'
import styled, { css } from 'styled-components'

import { getCategoryName } from '@/features/event-list/lib'
import type { EventCategoryDto } from '@/shared/api/event-categories'

import {
  CATEGORY_BADGE_COLORS,
  CATEGORY_SOFT_COLORS,
} from '../../../pages/events/styles/theme'
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

/** 연도가 자기 세기 안에서 어디에 위치하는지 0~1로 환산. 기간도 0~1로 환산해서 막대로 그림. */
const sparkPosition = (start: Date, end: Date | null) => {
  const startYear = start.getFullYear()
  const century = Math.floor(startYear / 100) * 100
  const startPos = (startYear - century) / 100
  const endYear = end ? end.getFullYear() : startYear
  const endPos = Math.min(1, (endYear - century) / 100)
  return {
    centuryLabel: `${Math.floor(startYear / 100) + 1}C`,
    startPercent: Math.max(0, Math.min(100, startPos * 100)),
    endPercent: Math.max(0, Math.min(100, endPos * 100)),
  }
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
  const spark = sparkPosition(start, end)

  // 재임 그룹 내 사건은 기존 그룹 컴포넌트 유지 (시각 컨텍스트가 다름)
  if (isInTenureGroup) {
    return (
      <List.CompactListItemInTenure
        $active={isActive}
        $depth={depth}
        $importance={tier}
        onClick={onSelect}
        data-event-id={node.id}
      >
        <TenureInner $tier={tier}>
          <TenureYear $tier={tier}>{startYear}</TenureYear>
          <CategoryDot $category={event.category} aria-hidden />
          <TenureTitleStack>
            <TenureTitle $tier={tier}>{node.title}</TenureTitle>
            {node.summary && tier !== 'normal' && (
              <TenureSummary>{node.summary}</TenureSummary>
            )}
          </TenureTitleStack>
          <TenureMeta>{duration}</TenureMeta>
        </TenureInner>
      </List.CompactListItemInTenure>
    )
  }

  return (
    <RowItem
      $active={isActive}
      $depth={depth}
      $tier={tier}
      onClick={onSelect}
      data-event-id={node.id}
    >
      <YearCol>
        <YearLarge $tier={tier}>{startYear}</YearLarge>
        <DurationSmall>{duration}</DurationSmall>
      </YearCol>

      <ContentCol $tier={tier}>
        <HeadRow>
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
              <FiChevronRight size={12} />
            </ExpandBtn>
          ) : (
            <ExpandSpacer />
          )}
          <CategoryChip $category={event.category}>
            {getCategoryName(event.category, dbCategories)}
          </CategoryChip>
          {tier !== 'normal' && (
            <ImportancePill $tier={tier}>
              {tier === 'critical' ? '핵심' : '주요'}
            </ImportancePill>
          )}
          <Title $tier={tier}>{node.title}</Title>
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
        </HeadRow>

        {node.summary && (
          <Summary $tier={tier}>{node.summary}</Summary>
        )}

        <Spark>
          <SparkRail>
            <SparkBar
              $category={event.category}
              style={{
                left: `${spark.startPercent}%`,
                width: `${Math.max(2, spark.endPercent - spark.startPercent)}%`,
              }}
            />
          </SparkRail>
          <SparkLabel>{spark.centuryLabel}</SparkLabel>
        </Spark>
      </ContentCol>

      <ActionsCol onClick={(e) => e.stopPropagation()}>
        {onToggleBookmark && (
          <BookmarkBtn
            type="button"
            onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
              e.stopPropagation()
              onToggleBookmark()
            }}
            $bookmarked={isBookmarked}
            title={isBookmarked ? '즐겨찾기 해제' : '즐겨찾기 추가'}
          >
            <FiBookmark
              size={14}
              fill={isBookmarked ? 'currentColor' : 'none'}
            />
          </BookmarkBtn>
        )}
      </ActionsCol>
    </RowItem>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// styled (theme-aware) — Row layout, no card box
// ─────────────────────────────────────────────────────────────────────────────

const RowItem = styled.div<{
  $active: boolean
  $depth: number
  $tier: ImportanceTier
}>`
  position: relative;
  display: grid;
  grid-template-columns: 88px 1fr auto;
  align-items: stretch;
  gap: 14px;
  padding: ${({ $tier }) =>
    $tier === 'critical'
      ? '18px 16px 18px 14px'
      : $tier === 'major'
        ? '14px 16px 14px 14px'
        : '11px 16px 11px 14px'};
  margin-left: ${({ $depth }) => $depth * 24}px;
  cursor: pointer;
  background: ${({ theme, $active }) =>
    $active
      ? theme.mode === 'dark'
        ? 'linear-gradient(90deg, rgba(37, 99, 235,0.14), rgba(37, 99, 235,0.04) 70%)'
        : 'linear-gradient(90deg, rgba(37, 99, 235,0.08), rgba(37, 99, 235,0.02) 70%)'
      : 'transparent'};
  border-bottom: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(15,23,42,0.05)'};
  transition: background 0.15s ease, border-color 0.15s ease;

  /* 좌측 importance 색 막대 (4·6·invisible) */
  &::before {
    content: '';
    position: absolute;
    left: 0;
    top: ${({ $tier }) => ($tier === 'critical' ? '8px' : '12px')};
    bottom: ${({ $tier }) => ($tier === 'critical' ? '8px' : '12px')};
    width: ${({ $tier, $active }) =>
      $active ? '5px' : $tier === 'critical' ? '4px' : $tier === 'major' ? '3px' : '0'};
    border-radius: 3px;
    background: ${({ $active, $tier }) =>
      $active
        ? '#2563eb'
        : $tier === 'critical'
          ? 'linear-gradient(180deg, #2563eb, #2563eb)'
          : $tier === 'major'
            ? 'rgba(245, 158, 11, 0.7)'
            : 'transparent'};
    transition: width 0.15s ease;
  }

  &:hover {
    background: ${({ theme, $active }) =>
      $active
        ? theme.mode === 'dark'
          ? 'linear-gradient(90deg, rgba(37, 99, 235,0.18), rgba(37, 99, 235,0.06) 70%)'
          : 'linear-gradient(90deg, rgba(37, 99, 235,0.1), rgba(37, 99, 235,0.03) 70%)'
        : theme.mode === 'dark'
          ? 'rgba(255,255,255,0.025)'
          : 'rgba(37, 99, 235,0.025)'};
  }
`

const YearCol = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  justify-content: center;
  gap: 2px;
  padding-left: 6px;
  text-align: right;
  font-variant-numeric: tabular-nums;
`

const YearLarge = styled.div<{ $tier: ImportanceTier }>`
  font-size: ${({ $tier }) =>
    $tier === 'critical' ? '20px' : $tier === 'major' ? '17px' : '15px'};
  font-weight: 800;
  letter-spacing: -0.025em;
  line-height: 1;
  color: ${({ theme }) => theme.colors.text.primary};
`

const DurationSmall = styled.div`
  font-size: 10.5px;
  font-weight: 600;
  letter-spacing: -0.005em;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const ContentCol = styled.div<{ $tier?: ImportanceTier }>`
  display: flex;
  flex-direction: column;
  gap: ${({ $tier }) =>
    $tier === 'critical' ? '8px' : $tier === 'major' ? '7px' : '5px'};
  min-width: 0;
`

const HeadRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
`

const ExpandBtn = styled.button<{ $expanded: boolean }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  padding: 0;
  border: none;
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(15,23,42,0.04)'};
  border-radius: 5px;
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
  width: 18px;
  height: 18px;
  flex-shrink: 0;
`

/* soft chip — Linear/Notion 톤. bg/border tint + 진한 글씨, 단색 배지보다 가벼움 */
const CategoryChip = styled.span<{ $category: string }>`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  border-radius: 6px;
  font-size: 10.5px;
  font-weight: 700;
  letter-spacing: 0.015em;
  text-transform: uppercase;
  white-space: nowrap;
  flex-shrink: 0;
  ${({ $category, theme }) => {
    const tok =
      CATEGORY_SOFT_COLORS[
        $category as keyof typeof CATEGORY_SOFT_COLORS
      ] ?? CATEGORY_SOFT_COLORS.other
    const isDark = theme.mode === 'dark'
    return css`
      background: rgba(${tok.rgb}, ${isDark ? 0.16 : 0.1});
      border: 1px solid rgba(${tok.rgb}, ${isDark ? 0.32 : 0.22});
      color: ${isDark ? tok.textDark : tok.text};
    `
  }}
`

const ImportancePill = styled.span<{ $tier: ImportanceTier }>`
  display: inline-flex;
  align-items: center;
  flex-shrink: 0;
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 10.5px;
  font-weight: 700;
  letter-spacing: 0.02em;
  text-transform: uppercase;
  ${({ theme, $tier }) =>
    $tier === 'critical'
      ? css`
          background: ${theme.mode === 'dark'
            ? 'rgba(37, 99, 235, 0.28)'
            : 'rgba(37, 99, 235, 0.16)'};
          color: ${theme.mode === 'dark' ? '#c7d2fe' : '#1e40af'};
        `
      : css`
          background: ${theme.mode === 'dark'
            ? 'rgba(245, 158, 11, 0.22)'
            : 'rgba(245, 158, 11, 0.16)'};
          color: ${theme.mode === 'dark' ? '#fcd34d' : '#b45309'};
        `}
`

const Title = styled.h4<{ $tier: ImportanceTier }>`
  flex: 1;
  margin: 0;
  min-width: 0;
  font-size: ${({ $tier }) =>
    $tier === 'critical'
      ? '16px'
      : $tier === 'major'
        ? '14.5px'
        : '13.5px'};
  font-weight: ${({ $tier }) => ($tier === 'critical' ? 800 : 700)};
  letter-spacing: -0.015em;
  line-height: 1.35;
  color: ${({ theme }) =>
    theme.mode === 'dark' ? '#f1f5f9' : '#0f172a'};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  display: flex;
  align-items: center;
  gap: 6px;
`

/* tier별 호흡감 차등: critical=2줄·여유 있는 행간, major=2줄·살짝 콤팩트, normal=1줄 */
const Summary = styled.p<{ $tier: ImportanceTier }>`
  margin: 0;
  font-size: ${({ $tier }) =>
    $tier === 'critical' ? '13px' : $tier === 'major' ? '12.5px' : '12.5px'};
  line-height: ${({ $tier }) =>
    $tier === 'critical' ? 1.6 : $tier === 'major' ? 1.5 : 1.45};
  color: ${({ theme }) => theme.colors.text.secondary};
  display: -webkit-box;
  -webkit-line-clamp: ${({ $tier }) =>
    $tier === 'critical' ? 2 : $tier === 'major' ? 2 : 1};
  -webkit-box-orient: vertical;
  overflow: hidden;
  word-break: break-word;
`

const Spark = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 2px;
`

/* 6px·rounded — 4px solid에서 한 단계 폴리시. 라일은 한 톤 옅게(0.05). */
const SparkRail = styled.div`
  position: relative;
  flex: 1;
  max-width: 240px;
  height: 6px;
  border-radius: 999px;
  background: ${({ theme }) =>
    theme.mode === 'dark'
      ? 'rgba(255,255,255,0.05)'
      : 'rgba(15,23,42,0.05)'};
  overflow: hidden;
`

/* 카테고리 베이스 → spark end로 향하는 라이트 그라데이션. 끝부분도 rounded. */
const SparkBar = styled.div<{ $category: string }>`
  position: absolute;
  top: 0;
  bottom: 0;
  border-radius: 999px;
  background: ${({ $category }) => {
    const base =
      CATEGORY_BADGE_COLORS[
        $category as keyof typeof CATEGORY_BADGE_COLORS
      ] ?? '#2563eb'
    const end =
      CATEGORY_SOFT_COLORS[$category as keyof typeof CATEGORY_SOFT_COLORS]
        ?.sparkEnd ?? base
    return `linear-gradient(90deg, ${base}, ${end})`
  }};
`

const SparkLabel = styled.span`
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.02em;
  color: ${({ theme }) => theme.colors.text.tertiary};
  flex-shrink: 0;
  font-variant-numeric: tabular-nums;
`

const ActionsCol = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  padding-right: 4px;
`

const BookmarkBtn = styled.button<{ $bookmarked: boolean }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  padding: 0;
  border: none;
  background: transparent;
  cursor: pointer;
  border-radius: 50%;
  color: ${({ theme, $bookmarked }) =>
    $bookmarked
      ? '#f59e0b'
      : theme.mode === 'dark'
        ? 'rgba(255,255,255,0.3)'
        : 'rgba(15,23,42,0.3)'};
  transition: background 0.15s, color 0.15s, transform 0.15s;
  flex-shrink: 0;

  &:hover {
    background: ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(255,255,255,0.06)'
        : 'rgba(15,23,42,0.05)'};
    color: ${({ $bookmarked }) => ($bookmarked ? '#d97706' : '#f59e0b')};
    transform: scale(1.1);
  }
`

const CategoryDot = styled.span<{ $category: string }>`
  width: 6px;
  height: 6px;
  border-radius: 50%;
  flex-shrink: 0;
  background: ${({ $category }) =>
    CATEGORY_BADGE_COLORS[$category as keyof typeof CATEGORY_BADGE_COLORS] ??
    '#2563eb'};
`

/* ── Tenure 그룹 안 사건 — 기존 그룹 컨테이너 안에서 컴팩트한 한 줄 ── */

const TenureInner = styled.div<{ $tier: ImportanceTier }>`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: ${({ $tier }) =>
    $tier === 'critical' ? '12px 16px' : '10px 16px'};
  min-width: 0;
`

const TenureYear = styled.span<{ $tier: ImportanceTier }>`
  font-size: ${({ $tier }) => ($tier === 'critical' ? '14px' : '13px')};
  font-weight: 800;
  letter-spacing: -0.02em;
  font-variant-numeric: tabular-nums;
  flex-shrink: 0;
  color: ${({ theme }) => theme.colors.text.primary};
`

const TenureTitleStack = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
  flex: 1;
`

const TenureTitle = styled.div<{ $tier: ImportanceTier }>`
  font-size: ${({ $tier }) =>
    $tier === 'critical' ? '14px' : $tier === 'major' ? '13px' : '12.5px'};
  font-weight: ${({ $tier }) => ($tier === 'critical' ? 700 : 600)};
  letter-spacing: -0.01em;
  color: ${({ theme }) => theme.colors.text.primary};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`

const TenureSummary = styled.div`
  font-size: 11.5px;
  color: ${({ theme }) => theme.colors.text.secondary};
  line-height: 1.4;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`

const TenureMeta = styled.span`
  font-size: 10.5px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.tertiary};
  flex-shrink: 0;
`
