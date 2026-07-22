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
import { type IsoDateParts, parseIsoDateParts } from '@/shared/lib/iso-date'

import {
  CATEGORY_BADGE_COLORS,
  CATEGORY_SOFT_COLORS,
} from '../../../pages/events/styles/theme'
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
  dbCategories: EventCategoryDto[]
  isBookmarked?: boolean
  /** 활성 검색어 — Title에서 매칭 부분 노란 배경 */
  searchQuery?: string
  /**
   * id 기반 콜백 — 상위(CompactList)가 *안정* 참조를 그대로 넘길 수 있어 React.memo가
   * 실효를 낸다(행마다 인라인 화살표를 만들면 memo가 매번 무력화됨).
   */
  onSelect: (id: string) => void
  onToggleExpansion: (id: string) => void
  onShowSummary: (id: string) => void
  onToggleBookmark?: (id: string) => void
}

/**
 * 검색어 매칭 부분 강조 — case-insensitive split. 빈 query/매칭 없음 시 그대로 반환.
 * 한국어·영문 혼합 안전 (lower-case 비교). 정규식 메타 문자 escape.
 */
function highlightMatches(text: string, query: string | undefined) {
  if (!query) return text
  const q = query.trim()
  if (!q) return text
  // regex 메타 escape
  const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const re = new RegExp(`(${escaped})`, 'gi')
  // String.split with capturing group → 매칭은 홀수 인덱스에 위치
  const parts = text.split(re)
  return parts.map((part, i) =>
    i % 2 === 1 ? (
      <Mark key={i}>{part}</Mark>
    ) : (
      <React.Fragment key={i}>{part}</React.Fragment>
    ),
  )
}

type ImportanceTier = 'critical' | 'major' | 'normal'

const tierFromNode = (
  importance: EventHierarchyNode['importance'] | undefined,
): ImportanceTier => {
  if (importance === 'critical') return 'critical'
  if (importance === 'major') return 'major'
  return 'normal'
}

/**
 * 기간 포맷 — ISO 구성요소(부호 연도 포함) 기반 borrow 차분. BC 음수 연도에서도
 * NaN 없이 동작한다(네이티브 Date는 `-0044-..`를 Invalid Date로 만들어 기간이 깨졌음).
 * 월/일 borrow는 30일 근사 — 일 단위 정밀도가 필요한 화면이 아니므로 충분.
 */
const formatDuration = (
  start: IsoDateParts | null,
  end: IsoDateParts | null,
): string => {
  if (!start) return ''
  if (
    !end ||
    (end.year === start.year &&
      end.month === start.month &&
      end.day === start.day)
  )
    return '1일'
  let years = end.year - start.year
  let months = end.month - start.month
  let days = end.day - start.day
  if (days < 0) {
    months -= 1
    days += 30
  }
  if (months < 0) {
    years -= 1
    months += 12
  }
  if (years > 0) return months > 0 ? `${years}년 ${months}개월` : `${years}년`
  if (months > 0) return days > 0 ? `${months}개월 ${days}일` : `${months}개월`
  return `${Math.max(1, days)}일`
}

const EventListItemImpl: React.FC<EventListItemProps> = ({
  node,
  event,
  depth,
  isExpanded,
  hasChildren,
  isActive,
  dbCategories,
  isBookmarked = false,
  searchQuery,
  onSelect,
  onToggleExpansion,
  onShowSummary,
  onToggleBookmark,
}) => {
  const tier = tierFromNode(node.importance)
  const startParts = parseIsoDateParts(node.period.start)
  const endParts = node.period.end ? parseIsoDateParts(node.period.end) : null
  const startYear = startParts
    ? startParts.year < 0
      ? `기원전 ${Math.abs(startParts.year)}`
      : startParts.year
    : '미상'
  const duration = formatDuration(startParts, endParts)
  const categoryName = getCategoryName(event.category, dbCategories)
  const categoryColor =
    CATEGORY_BADGE_COLORS[
      event.category as keyof typeof CATEGORY_BADGE_COLORS
    ] ?? '#2563eb'
  // 카테고리 라벨은 원색 텍스트(WCAG AA 미달) 대신 저채도 soft chip으로.
  const soft =
    CATEGORY_SOFT_COLORS[event.category as keyof typeof CATEGORY_SOFT_COLORS] ??
    CATEGORY_SOFT_COLORS.other

  return (
    <Stop
      $active={isActive}
      $depth={depth}
      $tier={tier}
      $categoryColor={categoryColor}
      onClick={() => onSelect(node.id)}
      onKeyDown={(e) => {
        // 키보드 네비 — Enter/Space로 행 선택. ↑↓ 이동·펼치기는 상위 catalog hook에서 처리
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onSelect(node.id)
        }
      }}
      tabIndex={0}
      role="listitem"
      aria-current={isActive ? 'true' : undefined}
      data-event-id={node.id}
      data-active={isActive ? 'true' : undefined}
    >
      {/* 단일 행 — 콘텐츠를 좌측에 밀착시키고(우측 정렬 메타 폐기) 제목 뒤에 메타가 바로
       * 따라오게 해, 짧은 제목에서 제목↔메타 사이가 텅 비던 '죽은 여백'을 제거한다. */}
      <Body>
        {hasChildren ? (
          <ExpandBtn
            type="button"
            onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
              e.stopPropagation()
              onToggleExpansion(node.id)
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
        <CategoryLabel
          $rgb={soft.rgb}
          $text={soft.text}
          $textDark={soft.textDark}
        >
          {categoryName}
        </CategoryLabel>
        <Title $tier={tier}>{highlightMatches(node.title, searchQuery)}</Title>

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

        {duration && <Duration>{duration}</Duration>}
        <Flags>
          <CountryFlags
            modern={event.relatedCountries}
            historical={event.relatedHistoricalCountries}
            max={3}
            size="sm"
          />
        </Flags>

        <RowActions>
          {hasChildren && depth === 0 && (
            <IconBtn
              type="button"
              onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                e.stopPropagation()
                onShowSummary(node.id)
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
                onToggleBookmark(node.id)
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
      </Body>
    </Stop>
  )
}

/**
 * React.memo — 부모(CompactList) 1회 리렌더에 전 행이 재조정되던 비용 차단.
 * props가 모두 원시값/안정 콜백이라 얕은 비교로 충분(콜백은 상위에서 useCallback 안정화).
 */
export const EventListItem = React.memo(EventListItemImpl)

// ─────────────────────────────────────────────────────────────────────────────
// styled — Timeline stop (2-row)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * 타임라인 정거장(row) — 2단 구성 컨테이너.
 * - 좌측 레일(CompactList의 left:32px)에 dot + connector를 ::before/::after로 그림.
 * - depth>0 행은 들여쓰기되며 connector가 길어져 들여쓴 양만큼 확장.
 * - active state: **좌측 4px 색 막대 + 미세 bg tint**(색 신호 단일화).
 */
const Stop = styled.div<{
  $active: boolean
  $depth: number
  $tier: ImportanceTier
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

  /* 활성 상태 좌측 인디고 막대(굵게) + 우측 라운드 — 긴 리스트에서도 위치 즉시 인지.
   * depth>0 행은 좌측 1px vertical guide(box-shadow inset)로 부모-자식 위계 시각화.
   * 두 효과 모두 box-shadow 스택으로 한 번에 적용 — 덕분에 active 위에 guide도 같이 표시. */
  border-radius: ${({ $active }) => ($active ? '6px' : '0')};
  box-shadow: ${({ $active, $depth, theme }) => {
    const shadows: string[] = []
    if ($depth > 0) {
      const c =
        theme.mode === 'dark'
          ? 'rgba(147, 197, 253, 0.22)'
          : 'rgba(37, 99, 235, 0.18)'
      shadows.push(`inset 1px 0 0 0 ${c}`)
    }
    if ($active) {
      shadows.push('inset 4px 0 0 0 #2563eb')
    }
    return shadows.length ? shadows.join(', ') : 'none'
  }};
  ${({ $active }) =>
    $active &&
    css`
      border-bottom-color: transparent;
    `}

  /* 레일 → 행 connector. solid hairline + 약간 더 진한 톤으로 위계 인지 강화.
   * 점선 dashed는 깊어질수록 시각 약했음. */
  &::before {
    content: '';
    position: absolute;
    left: ${({ $depth }) => `calc(-1 * var(--rail-inset) - ${$depth * 22}px)`};
    top: 50%;
    width: ${({ $depth }) => `calc(var(--rail-inset) + ${$depth * 22}px)`};
    height: 1px;
    border-top: 1px solid
      ${({ theme }) =>
        theme.mode === 'dark'
          ? 'rgba(147, 197, 253, 0.45)'
          : 'rgba(37, 99, 235, 0.35)'};
    pointer-events: none;
  }

  /* 레일 위 도트 — 시간축의 정거장.
   *
   * 색 신호 단일화: 도트는 항상 **카테고리 색**.
   * importance는 도트 *크기*(7/9/11px)와 별(★) 글리프로 표현.
   * active 인식: 카테고리 색 그대로 유지 + 외곽 amber ring(box-shadow)로 색 충돌 회피.
   *   (이전: 흰 가운데 + indigo border → 카테고리 파란 색과 시각 충돌) */
  &::after {
    content: '';
    position: absolute;
    left: ${({ $depth }) => `calc(-1 * var(--rail-inset) - ${$depth * 22}px)`};
    top: 50%;
    transform: translate(-50%, -50%);
    width: ${({ $active, $tier }) =>
      $active ? '11px' : $tier === 'critical' ? '9px' : '7px'};
    height: ${({ $active, $tier }) =>
      $active ? '11px' : $tier === 'critical' ? '9px' : '7px'};
    background: ${({ $categoryColor }) => $categoryColor};
    border: none;
    border-radius: 50%;
    /* separator 링만 — active 식별은 좌측 인디고 막대·bg tint·도트 확대(7→11px)가 담당.
     * amber는 북마크·레거시 major와 중복 신호라 도트 ring에서는 제거. */
    box-shadow: ${({ theme }) => {
      const sep = theme.mode === 'dark' ? '#0f0f12' : '#ffffff'
      return `0 0 0 2px ${sep}`
    }};
    z-index: 1;
    transition: background 0.14s ease, width 0.14s ease, height 0.14s ease,
      box-shadow 0.14s ease;
  }

  /* active별 bg tint — 활성 행이 hover 행과 명확히 구분되도록 강화. */
  ${({ $active, theme }) => {
    const isDark = theme.mode === 'dark'
    if ($active) {
      return css`
        background: ${isDark
          ? 'rgba(37, 99, 235, 0.22)'
          : 'rgba(37, 99, 235, 0.13)'};
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
          ? 'rgba(37, 99, 235, 0.28)'
          : 'rgba(37, 99, 235, 0.18)'
        : theme.mode === 'dark'
          ? 'rgba(255, 255, 255, 0.06)'
          : 'rgba(15, 23, 42, 0.05)'};
  }

  /* 키보드 focus 시각화 — 마우스 click에선 안 뜨고 Tab 순회 시에만 ring */
  &:focus {
    outline: none;
  }
  &:focus-visible {
    outline: 2px solid #2563eb;
    outline-offset: -2px;
    border-radius: 6px;
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
    &::after {
      transition: none;
    }
  }
`

/* 단일 행 컨테이너 — 모든 토큰(연도·카테고리·제목·별·기간·국기·액션)을 한 줄에 좌측 밀착.
 * max-width로 읽기 컬럼을 제한하되, flex:1 스페이서가 없으므로 콘텐츠는 좌측에 붙고 남는
 * 폭은 예측 가능한 우측 여백이 된다(제목↔메타 사이 죽은 여백 소멸). */
const Body = styled.div`
  flex: 1;
  min-width: 0;
  max-width: 880px;
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 8px;
`

const RowActions = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 2px;
  margin-left: 2px;
  flex-shrink: 0;
`

const ExpandBtn = styled.button<{ $expanded: boolean }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
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
  width: 20px;
  height: 20px;
  flex-shrink: 0;
`

const Year = styled.span<{ $tier: ImportanceTier }>`
  /* 날짜는 보조 데이텀 — 항상 제목보다 한 단계 아래. tier별 크기 증가를 없애 고정 12px로,
     굵기도 500으로 낮춰(중요도 신호는 제목·별이 담당) 제목이 확실한 주인공이 되게 한다. */
  font-size: 12px;
  font-weight: 500;
  letter-spacing: -0.01em;
  color: ${({ theme }) => theme.colors.text.tertiary};
  font-variant-numeric: tabular-nums;
  flex-shrink: 0;
  min-width: 36px;
  /* 모바일 — 연도는 sticky 연도 divider와 중복이라, 좁은 폭에선 숨겨 제목에 폭을 양보. */
  @media (max-width: 640px) {
    display: none;
  }
`

const Title = styled.span<{ $tier: ImportanceTier }>`
  /* 단일 행 밀도 — 제목은 자기 폭(flex:0 1 auto)만 차지하고, 넘치면 …로 자른다.
   * flex:1을 쓰지 않아 뒤따르는 메타가 제목 바로 옆에 붙어 '죽은 여백'이 생기지 않는다. */
  flex: 0 1 auto;
  min-width: 0;
  /* 제목이 확실한 주인공 — 하한 14px, normal도 weight 600으로 올려 연도(12px/500)와 위계 명확. */
  font-size: ${({ $tier }) =>
    $tier === 'critical' ? '15px' : $tier === 'major' ? '14.5px' : '14px'};
  font-weight: ${({ $tier }) =>
    $tier === 'critical' ? 700 : $tier === 'major' ? 650 : 600};
  letter-spacing: -0.01em;
  line-height: 1.3;
  color: ${({ theme }) => (theme.mode === 'dark' ? '#f1f5f9' : '#0f172a')};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`

/* 검색어 매칭 강조 — 노란 배경 + 진한 텍스트. 다크 모드는 amber 톤. */
const Mark = styled.mark`
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(251, 191, 36, 0.5)' : '#fef3c7'};
  color: inherit;
  padding: 0 1px;
  border-radius: 2px;
`

/* importance — 색 신호 사용 안 함. 별 글리프 톤 다운: dot 크기와 별이 함께 위계 보조하되,
 * 별이 카테고리 dot보다 강해 시선을 가로채지 않게 muted 색·낮은 opacity. */
const ImportanceStars = styled.span<{ $tier: ImportanceTier }>`
  display: inline-flex;
  align-items: center;
  flex-shrink: 0;
  font-size: 9px;
  letter-spacing: 0.5px;
  font-weight: 600;
  opacity: ${({ $tier }) => ($tier === 'critical' ? 0.6 : 0.45)};
  color: ${({ theme }) => theme.colors.text.tertiary};
`

/* 저채도 soft chip — 원색 텍스트(AA 미달)를 대신. 배경 tint + 어둡게 조정한 텍스트색으로
 * 대비 확보하고, 칩 형태로 '분류'임을 명확히(중요도=별과 신호 분리). */
const CategoryLabel = styled.span<{
  $rgb: string
  $text: string
  $textDark: string
}>`
  flex-shrink: 0;
  padding: 2px 8px;
  border-radius: 6px;
  font-size: 10.5px;
  font-weight: 600;
  letter-spacing: 0;
  line-height: 1.5;
  background: ${({ $rgb, theme }) =>
    theme.mode === 'dark' ? `rgba(${$rgb}, 0.16)` : `rgba(${$rgb}, 0.1)`};
  color: ${({ $text, $textDark, theme }) =>
    theme.mode === 'dark' ? $textDark : $text};
`

const Duration = styled.span`
  font-size: 11px;
  font-weight: 500;
  letter-spacing: -0.005em;
  color: ${({ theme }) => theme.colors.text.tertiary};
  font-variant-numeric: tabular-nums;
  flex-shrink: 0;

  @media (max-width: 600px) {
    display: none;
  }
`

const Flags = styled.span`
  display: inline-flex;
  align-items: center;
  flex-shrink: 0;
`

const IconBtn = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  padding: 0;
  border: none;
  background: transparent;
  border-radius: 6px;
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
  width: 28px;
  height: 28px;
  padding: 0;
  border: none;
  background: transparent;
  cursor: pointer;
  border-radius: 6px;
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
