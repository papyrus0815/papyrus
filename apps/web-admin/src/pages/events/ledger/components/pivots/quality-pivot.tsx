/**
 * Quality Pivot — 데이터 누락 점검용 표.
 *
 * 어드민 관점: 어떤 사건이 어떤 정보가 비어있는지 한눈에.
 *  - 본문 (description)
 *  - 국가 (relatedCountries / relatedHistoricalCountries)
 *  - 키워드 (keywords)
 *
 * 모두 채워진 사건은 ✓로, 누락은 빨간 ✗로 명시.
 */
import React, { useMemo } from 'react'

import { FiCheck, FiX } from 'react-icons/fi'
import styled from 'styled-components'

import {
  DIGIT_DISPLAY,
  fontTier,
  ledgerBackground,
  ledgerHairline,
  ledgerHoverFill,
  ledgerInkLine,
  resolveCategory,
} from '../../styles/ledger-tokens'
import type { HistoricalEvent } from '@/entities/event/model'
import { startYearOf } from '../../lib/group-utils'
import { EmptyState } from '../empty-state'

interface Props {
  events: HistoricalEvent[]
  onSelectEvent: (id: string) => void
}

interface QualityRow {
  event: HistoricalEvent
  hasDescription: boolean
  hasCountries: boolean
  hasKeywords: boolean
  issuesCount: number
}

export const QualityPivot: React.FC<Props> = ({ events, onSelectEvent }) => {
  const rows = useMemo<QualityRow[]>(() => {
    return events
      .map((evt) => {
        const hasDescription = (evt.description?.trim().length ?? 0) > 0
        const hasCountries =
          (evt.relatedCountries?.length ?? 0) > 0 ||
          (evt.relatedHistoricalCountries?.length ?? 0) > 0
        const hasKeywords = (evt.keywords?.length ?? 0) > 0
        const issuesCount =
          (hasDescription ? 0 : 1) +
          (hasCountries ? 0 : 1) +
          (hasKeywords ? 0 : 1)
        return { event: evt, hasDescription, hasCountries, hasKeywords, issuesCount }
      })
      .sort((first, second) => {
        // 누락 많은 것부터, 그 안에선 시간순
        if (second.issuesCount !== first.issuesCount)
          return second.issuesCount - first.issuesCount
        return (startYearOf(first.event) ?? 0) - (startYearOf(second.event) ?? 0)
      })
  }, [events])

  const totalIssues = rows.filter((row) => row.issuesCount > 0).length
  const totalClean = rows.length - totalIssues

  if (rows.length === 0) {
    return (
      <EmptyState
        title="표시할 사건이 없습니다"
        hint="현재 렌즈 조건에 맞는 사건이 없어요."
      />
    )
  }

  return (
    <Wrap>
      <Summary>
        <SummaryItem>
          <SummaryLabel>전체</SummaryLabel>
          <SummaryNum>{rows.length.toLocaleString()}</SummaryNum>
        </SummaryItem>
        <SummaryItem $tone="ok">
          <SummaryLabel>완전</SummaryLabel>
          <SummaryNum>{totalClean.toLocaleString()}</SummaryNum>
        </SummaryItem>
        <SummaryItem $tone="bad">
          <SummaryLabel>누락 있음</SummaryLabel>
          <SummaryNum>{totalIssues.toLocaleString()}</SummaryNum>
        </SummaryItem>
      </Summary>

      <Table>
        <thead>
          <tr>
            <Th $w="60px">연도</Th>
            <Th>제목</Th>
            <Th $w="100px">카테고리</Th>
            <Th $w="60px" $center>본문</Th>
            <Th $w="60px" $center>국가</Th>
            <Th $w="60px" $center>키워드</Th>
            <Th $w="60px" $right>누락</Th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const color = resolveCategory(row.event.category).color
            return (
              <Row
                key={row.event.id}
                $hasIssues={row.issuesCount > 0}
                onClick={() => onSelectEvent(row.event.id)}
              >
                <Td $tabular>{startYearOf(row.event) ?? '?'}</Td>
                <Td>
                  <TitleWrap>
                    <Dot $color={color} />
                    <span>{row.event.title}</span>
                  </TitleWrap>
                </Td>
                <Td>
                  <CatPill $color={color}>{row.event.category || '—'}</CatPill>
                </Td>
                <Td $center>
                  {row.hasDescription ? <Ok /> : <Bad />}
                </Td>
                <Td $center>{row.hasCountries ? <Ok /> : <Bad />}</Td>
                <Td $center>{row.hasKeywords ? <Ok /> : <Bad />}</Td>
                <Td $tabular $right>
                  {row.issuesCount > 0 ? (
                    <IssueChip>{row.issuesCount}</IssueChip>
                  ) : (
                    <Muted>—</Muted>
                  )}
                </Td>
              </Row>
            )
          })}
        </tbody>
      </Table>
    </Wrap>
  )
}

const Ok = () => (
  <OkIcon>
    <FiCheck size={11} />
  </OkIcon>
)

const Bad = () => (
  <BadIcon>
    <FiX size={11} />
  </BadIcon>
)

// ─── styles ─────────────────────────────────────────────

const Wrap = styled.div`
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow-x: auto;
`

const Summary = styled.div`
  display: flex;
  gap: 12px;
  padding: 12px 20px;
  border-bottom: 1px solid ${({ theme }) => ledgerInkLine(theme.mode)};
  flex-wrap: wrap;
`

const SummaryItem = styled.div<{ $tone?: 'ok' | 'bad' }>`
  display: inline-flex;
  align-items: baseline;
  gap: 6px;
  padding: 4px 12px;
  border-radius: 6px;
  background: ${({ $tone }) =>
    $tone === 'ok'
      ? 'rgba(16, 185, 129, 0.08)'
      : $tone === 'bad'
        ? 'rgba(220, 38, 38, 0.08)'
        : 'transparent'};
`

const SummaryLabel = styled.span`
  ${fontTier('LABEL')}
  font-weight: 700;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const SummaryNum = styled.span`
  ${DIGIT_DISPLAY}
  ${fontTier('HEADING')}
  letter-spacing: -0.02em;
  color: ${({ theme }) => theme.colors.text.primary};
`

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  ${fontTier('BODY')}

  thead tr {
    position: sticky;
    top: 0;
    background: ${({ theme }) => ledgerBackground(theme.mode)};
    z-index: 1;
  }

  th:first-child,
  td:first-child {
    position: sticky;
    left: 0;
    background: ${({ theme }) => ledgerBackground(theme.mode)};
  }

  thead th:first-child {
    z-index: 2;
  }
`

const Th = styled.th<{ $w?: string; $center?: boolean; $right?: boolean }>`
  text-align: ${({ $center, $right }) =>
    $center ? 'center' : $right ? 'right' : 'left'};
  padding: 10px 14px;
  ${fontTier('META')}
  font-weight: 700;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: ${({ theme }) => theme.colors.text.tertiary};
  border-bottom: 1px solid ${({ theme }) => ledgerInkLine(theme.mode)};
  ${({ $w }) =>
    $w &&
    `
      width: ${$w};
      min-width: ${$w};
    `}
`

const Row = styled.tr<{ $hasIssues: boolean }>`
  cursor: pointer;
  background: ${({ $hasIssues, theme }) =>
    $hasIssues
      ? theme.mode === 'dark'
        ? 'rgba(252, 165, 165, 0.06)'
        : 'rgba(220, 38, 38, 0.03)'
      : 'transparent'};
  transition: background 0.1s;

  &:hover {
    background: ${({ theme }) => ledgerHoverFill(theme.mode)};
  }
`

const Td = styled.td<{ $tabular?: boolean; $center?: boolean; $right?: boolean }>`
  padding: 9px 14px;
  border-bottom: 1px solid ${({ theme }) => ledgerHairline(theme.mode)};
  text-align: ${({ $center, $right }) =>
    $center ? 'center' : $right ? 'right' : 'left'};
  ${({ $tabular }) => $tabular && DIGIT_DISPLAY}
`

const TitleWrap = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.primary};
`

const Dot = styled.span<{ $color: string }>`
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: ${({ $color }) => $color};
`

const CatPill = styled.span<{ $color: string }>`
  display: inline-flex;
  align-items: center;
  height: 18px;
  padding: 0 8px;
  border-radius: 999px;
  background: ${({ $color }) => $color}1a;
  color: ${({ $color }) => $color};
  ${fontTier('META')}
  font-weight: 700;
`

const OkIcon = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: rgba(16, 185, 129, 0.16);
  color: #047857;
`

const BadIcon = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: rgba(220, 38, 38, 0.16);
  color: #b91c1c;
`

const IssueChip = styled.span`
  ${DIGIT_DISPLAY}
  display: inline-flex;
  align-items: center;
  height: 18px;
  padding: 0 8px;
  border-radius: 4px;
  background: rgba(220, 38, 38, 0.14);
  color: #b91c1c;
  ${fontTier('META')}
  font-weight: 700;
`

const Muted = styled.span`
  color: ${({ theme }) => theme.colors.text.tertiary};
`
