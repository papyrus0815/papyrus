import styled from 'styled-components'

import type { ElectionSummary } from '../../model/use-country-dashboard-stats'
import { IconVote } from '../country-detail-dashboard.icons'
import { ChartSkeleton } from './chart-skeleton'
import { formatDDay, formatDaysAgo, formatStartDate } from './format'

export interface ElectionCardProps {
  next: ElectionSummary | null
  recent: ElectionSummary | null
  isLoading: boolean
  onOpen: () => void
  /**
   * 위 「이 정권을 낳은 선거」에 이미 떠 있는 선거 id. 같은 선거면 이 카드는 그리지
   * 않는다 — 한 화면에 같은 선거가 두 번 나오면 둘 다 흐려진다.
   */
  hideElectionId?: string | null
}

export function ElectionCard({
  next,
  recent,
  isLoading,
  onOpen,
  hideElectionId,
}: ElectionCardProps) {
  if (isLoading) {
    return <ChartSkeleton variant="text" lines={1} />
  }

  const visibleNext = next && next.id !== hideElectionId ? next : null
  const visibleRecent =
    recent &&
    recent.id !== hideElectionId &&
    recent.id !== visibleNext?.id
      ? recent
      : null

  const items: Array<{ summary: ElectionSummary; upcoming: boolean }> = [
    ...(visibleNext ? [{ summary: visibleNext, upcoming: true }] : []),
    ...(visibleRecent ? [{ summary: visibleRecent, upcoming: false }] : []),
  ]

  if (items.length === 0) {
    return null
  }

  return (
    <ElectionStrip role="group" aria-label="국가 선거 일정 및 최근 선거">
      {items.map(({ summary, upcoming }) => (
        <Card
          key={`${upcoming ? 'next' : 'recent'}-${summary.id}`}
          type="button"
          onClick={onOpen}
          $upcoming={upcoming}
        >
          <CardLabel $upcoming={upcoming}>
            <IconVote />
            {upcoming ? '다음 선거' : '최근 선거'}
          </CardLabel>
          <CardWhen $upcoming={upcoming}>
            {upcoming
              ? formatDDay(summary.pollDate)
              : formatDaysAgo(summary.pollDate)}
          </CardWhen>
          <CardName title={summary.name}>{summary.name}</CardName>
          <CardDate>{formatStartDate(summary.pollDate)}</CardDate>
          <CardActionHint>선거 탭 ›</CardActionHint>
        </Card>
      ))}
    </ElectionStrip>
  )
}

const ElectionStrip = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  border-top: 1px solid ${({ theme }) => theme.colors.border.medium};

  @media (min-width: 820px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
`

const Card = styled.button<{ $upcoming: boolean }>`
  display: flex;
  align-items: baseline;
  gap: 10px;
  min-width: 0;
  padding: 10px 6px;
  border: none;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.light};
  border-radius: 0;
  background: ${({ $upcoming, theme }) =>
    $upcoming
      ? theme.mode === 'dark'
        ? 'rgba(99, 102, 241, 0.08)'
        : 'rgba(79, 70, 229, 0.04)'
      : 'transparent'};
  font-family: inherit;
  cursor: pointer;
  text-align: left;

  @media (min-width: 820px) {
    &:nth-child(odd) {
      border-right: 1px solid ${({ theme }) => theme.colors.border.light};
      padding-right: 14px;
    }

    &:nth-child(even) {
      padding-left: 14px;
    }

    &:last-child:nth-child(odd) {
      grid-column: 1 / -1;
      border-right: none;
      padding-right: 6px;
    }
  }

  &:hover {
    background: ${({ theme }) => theme.colors.hover};
  }
`

const CardLabel = styled.span<{ $upcoming: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  flex-shrink: 0;
  font-size: 12px;
  font-weight: 700;
  color: ${({ $upcoming, theme }) =>
    $upcoming
      ? theme.mode === 'dark'
        ? '#a5b4fc'
        : '#4338ca'
      : theme.colors.text.tertiary};

  svg {
    width: 12px;
    height: 12px;
  }
`

const CardWhen = styled.span<{ $upcoming: boolean }>`
  font-size: 14px;
  font-weight: 800;
  letter-spacing: -0.02em;
  font-variant-numeric: tabular-nums;
  flex-shrink: 0;
  color: ${({ $upcoming, theme }) =>
    $upcoming
      ? theme.mode === 'dark'
        ? '#a5b4fc'
        : '#4338ca'
      : theme.colors.text.secondary};
`

const CardName = styled.span`
  font-size: 12.5px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.primary};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`

const CardDate = styled.span`
  margin-left: auto;
  flex-shrink: 0;
  font-size: 12px;
  font-variant-numeric: tabular-nums;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const CardActionHint = styled.span`
  flex-shrink: 0;
  font-size: 11px;
  font-weight: 700;
  color: ${({ theme }) => (theme.mode === 'dark' ? '#a5b4fc' : '#4f46e5')};
`
