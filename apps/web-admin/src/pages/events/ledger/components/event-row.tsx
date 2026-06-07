/**
 * EventRow — 사건 한 줄.
 *
 * 가로 레이아웃:
 *   [year]  [── duration bar ──]  [title]  [meta chips: 기간·국가·자식]  [actions]
 *
 * 막대:
 *  - 길이 = 기간 (log scale로 1일~10년 사이 가독성)
 *  - 두께 = 중요도
 *  - 색 = 카테고리
 *
 * 자식 사건이 있으면 부모 행 아래에 1단계 들여써 줄 형태로 표시 (인라인).
 *
 * 클릭 → onExpandToggle. 활성 상태는 좌측 두꺼운 색 띠로 표시.
 */
import React from 'react'

import { FiChevronRight, FiGitBranch } from 'react-icons/fi'
import styled, { css } from 'styled-components'

import { parseIsoDateParts } from '@/shared/lib/iso-date'

import {
  DIGIT_DISPLAY,
  IMPORTANCE_BAR_HEIGHT,
  IMPORTANCE_OPACITY,
  type LedgerImportance,
  durationInDays,
  fontTier,
  formatDuration,
  importanceFromHierarchy,
  ledgerAccent,
  ledgerAccentSubtle,
  ledgerChipFill,
  ledgerExpandedFill,
  ledgerHairline,
  ledgerHoverFill,
  ledgerSubtleFill,
  resolveCategory,
} from '../styles/ledger-tokens'
import type {
  EventHierarchyNode,
  HistoricalEvent,
} from '@/entities/event/model'

interface Props {
  event: HistoricalEvent
  expanded: boolean
  onToggleExpand: (id: string) => void
}

/** log scale 매핑 — 1일 ~ 3650일(10년) → 6% ~ 100% bar lane */
const barLengthPct = (days: number): number => {
  if (days <= 1) return 6
  if (days >= 3650) return 100
  const min = Math.log(1)
  const max = Math.log(3650)
  const val = Math.log(days)
  const tab = (val - min) / (max - min)
  return 6 + tab * 94
}

const startYearOf = (evt: HistoricalEvent | EventHierarchyNode): number | null => {
  const start =
    'startDate' in evt ? evt.startDate : evt.period?.start
  if (!start) return null
  return parseIsoDateParts(start)?.year ?? null
}

const VISIBLE_COUNTRIES = 3

export const EventRow: React.FC<Props> = ({ event, expanded, onToggleExpand }) => {
  const year = startYearOf(event)
  const days = durationInDays(event.startDate, event.endDate ?? null)
  const importance: LedgerImportance = importanceFromHierarchy(
    event.hierarchy?.importance,
    event.hierarchy?.children?.length ?? 0,
  )
  const category = resolveCategory(event.category)

  const countries = [
    ...(event.relatedHistoricalCountries ?? []).map((item) => ({
      id: item.id,
      name: item.name,
      flagEmoji: undefined as string | undefined,
    })),
    ...(event.relatedCountries ?? []),
  ]
  const visibleCountries = countries.slice(0, VISIBLE_COUNTRIES)
  const overflowCountries = countries.slice(VISIBLE_COUNTRIES)
  const childCount = event.hierarchy?.children?.length ?? 0

  return (
    <Row
      type="button"
      $expanded={expanded}
      $color={category.color}
      onClick={() => onToggleExpand(event.id)}
      data-event-id={event.id}
      aria-expanded={expanded}
    >
      <ActiveStripe $color={category.color} $expanded={expanded} />

      <Year>{year ?? '?'}</Year>

      <BarLane>
        <Bar
          $width={barLengthPct(days)}
          $color={category.color}
          $height={IMPORTANCE_BAR_HEIGHT[importance]}
          $opacity={IMPORTANCE_OPACITY[importance]}
        />
      </BarLane>

      <Title>{event.title}</Title>

      <MetaChips>
        <DurationChip>{formatDuration(days)}</DurationChip>
        {visibleCountries.length > 0 && (
          <CountryRow>
            {visibleCountries.map((item) => (
              <CountryChip key={item.id} title={item.name}>
                {item.flagEmoji ? (
                  <span aria-hidden="true">{item.flagEmoji}</span>
                ) : (
                  <CountryDot />
                )}
                <span>{item.name}</span>
              </CountryChip>
            ))}
            {overflowCountries.length > 0 && (
              <CountryChip
                title={overflowCountries.map((item) => item.name).join(', ')}
              >
                +{overflowCountries.length}
              </CountryChip>
            )}
          </CountryRow>
        )}
        {childCount > 0 && (
          <ChildChip
            title={`${childCount}건의 자식 사건 — 클릭해 펼치기`}
            aria-label={`${childCount}건의 자식 사건`}
          >
            <FiGitBranch size={10} />
            <span>{childCount}</span>
          </ChildChip>
        )}
      </MetaChips>

      <Caret $expanded={expanded}>
        <FiChevronRight size={14} />
      </Caret>
    </Row>
  )
}

const BarLane = styled.div`
  position: relative;
  height: 12px;
  display: flex;
  align-items: center;
  min-width: 80px;
`

const DurationChip = styled.span`
  ${DIGIT_DISPLAY}
  display: inline-flex;
  align-items: center;
  height: 18px;
  padding: 0 8px;
  border-radius: 3px;
  background: ${({ theme }) => ledgerSubtleFill(theme.mode)};
  color: ${({ theme }) => theme.colors.text.tertiary};
  ${fontTier('META')}
`

/* 행 — 높이 ~44px(padding 12px·내용 ~20px). padding은 4-multiple로 정렬. */
const Row = styled.button<{ $expanded: boolean; $color: string }>`
  position: relative;
  display: grid;
  grid-template-columns: 24px 60px minmax(120px, 1fr) minmax(0, 2fr) auto 24px;
  align-items: center;
  gap: 12px;
  width: 100%;
  text-align: left;
  padding: 12px 16px;
  border: none;
  background: transparent;
  cursor: pointer;
  border-bottom: 1px solid ${({ theme }) => ledgerHairline(theme.mode)};
  transition: background 0.12s;

  ${({ $expanded, theme }) =>
    $expanded &&
    css`
      background: ${ledgerExpandedFill(theme.mode)};
    `}

  &:hover {
    background: ${({ theme }) => ledgerHoverFill(theme.mode)};
  }

  @media (max-width: 720px) {
    grid-template-columns: 18px 50px minmax(0, 1fr) auto 20px;
    gap: 8px;
    padding: 12px 12px;

    & > ${BarLane}, & ${DurationChip} {
      display: none;
    }
  }
`

const ActiveStripe = styled.span<{ $color: string; $expanded: boolean }>`
  width: 3px;
  height: 24px;
  border-radius: 2px;
  background: ${({ $color, $expanded }) =>
    $expanded ? $color : `${$color}55`};
  transition: background 0.12s;
`

const Year = styled.span`
  ${DIGIT_DISPLAY}
  ${fontTier('TITLE')}
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
`

const Bar = styled.div<{
  $width: number
  $color: string
  $height: number
  $opacity: number
}>`
  width: ${({ $width }) => $width}%;
  min-width: 6px;
  height: ${({ $height }) => $height}px;
  background: ${({ $color }) => $color};
  opacity: ${({ $opacity }) => $opacity};
  border-radius: 1px;
`

const Title = styled.span`
  ${fontTier('TITLE')}
  color: ${({ theme }) => theme.colors.text.primary};
  letter-spacing: -0.01em;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`

const MetaChips = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  flex-wrap: nowrap;
  overflow: hidden;
`

const CountryRow = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 3px;
  flex-wrap: nowrap;
  overflow: hidden;
`

const CountryChip = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 3px;
  height: 18px;
  padding: 0 8px;
  border-radius: 3px;
  background: ${({ theme }) => ledgerChipFill(theme.mode)};
  color: ${({ theme }) => theme.colors.text.secondary};
  ${fontTier('META')}
  white-space: nowrap;
`

const CountryDot = styled.span`
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: ${({ theme }) => ledgerAccent(theme.mode)};
  opacity: 0.55;
`

const ChildChip = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 2px;
  height: 18px;
  padding: 0 6px;
  border-radius: 3px;
  background: ${({ theme }) => ledgerAccentSubtle(theme.mode)};
  color: ${({ theme }) => ledgerAccent(theme.mode)};
  ${fontTier('META')}
  font-weight: 700;
`

const Caret = styled.span<{ $expanded: boolean }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: ${({ theme }) => theme.colors.text.tertiary};
  transition: transform 0.18s;
  transform: rotate(${({ $expanded }) => ($expanded ? 90 : 0)}deg);
`
