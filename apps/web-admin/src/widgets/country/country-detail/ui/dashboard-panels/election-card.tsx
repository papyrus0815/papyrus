import styled from 'styled-components'

import type { ElectionSummary } from '../../model/use-country-dashboard-stats'
import { IconVote } from '../country-detail-dashboard.icons'
import * as S from '../country-detail-dashboard.styles'
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
    return (
      <S.CardPanel $accent="indigo">
        <S.CardPanelTitleRow>
          <S.CardPanelTitle>선거</S.CardPanelTitle>
        </S.CardPanelTitleRow>
        <S.FeedEmpty>불러오는 중...</S.FeedEmpty>
      </S.CardPanel>
    )
  }
  /*
   * 빈 상태는 한 줄로. 카드 한 장(180px)을 "등록된 선거가 없습니다" 한 문장에 내주면
   * 정작 옆의 현 정부 명단보다 커져, 없는 것이 있는 것보다 눈에 띄는 지면이 된다.
   */
  if (!next && !recent) {
    return (
      <EmptyLine type="button" onClick={onOpen}>
        <IconVote />
        <span>선거 기록 없음</span>
        <EmptyLineCta>등록하기</EmptyLineCta>
      </EmptyLine>
    )
  }
  const shown = next ?? recent
  if (!shown) return null
  if (hideElectionId && shown.id === hideElectionId) return null

  const isUpcoming = !!next
  return (
    <Card type="button" onClick={onOpen} $upcoming={isUpcoming}>
      <CardLabel $upcoming={isUpcoming}>
        <IconVote />
        {isUpcoming ? '다음 선거' : '최근 선거'}
      </CardLabel>
      <CardWhen $upcoming={isUpcoming}>
        {isUpcoming ? formatDDay(shown.pollDate) : formatDaysAgo(shown.pollDate)}
      </CardWhen>
      <CardName title={shown.name}>{shown.name}</CardName>
      <CardDate>{formatStartDate(shown.pollDate)}</CardDate>
    </Card>
  )
}

/*
 * 한 줄짜리 카드. 예전엔 세로로 쌓인 패널이라 '최근 선거 / 1년 전 / 이름 / 날짜'가
 * 네 줄을 먹으면서, 정작 위의 정권 정보보다 커 보였다. 가로로 눕혀 한 줄에 담는다.
 * 다가올 선거는 강조색, 지난 선거는 조용하게 — 지금 신경 쓸 것과 아닌 것을 가른다.
 */
const Card = styled.button<{ $upcoming: boolean }>`
  display: flex;
  align-items: baseline;
  gap: 10px;
  padding: 10px 14px;
  border-radius: 10px;
  border: 1px solid
    ${({ $upcoming, theme }) =>
      $upcoming ? 'rgba(79,70,229,0.35)' : theme.colors.border.light};
  background: ${({ $upcoming, theme }) =>
    $upcoming ? 'rgba(79,70,229,0.06)' : 'transparent'};
  cursor: pointer;
  text-align: left;

  &:hover {
    background: ${({ theme }) => theme.colors.hover};
  }
`

const CardLabel = styled.span<{ $upcoming: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  flex-shrink: 0;
  font-size: 11px;
  font-weight: 700;
  color: ${({ $upcoming, theme }) =>
    $upcoming ? '#4338ca' : theme.colors.text.tertiary};

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
    $upcoming ? '#4338ca' : theme.colors.text.secondary};
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
  font-size: 11.5px;
  font-variant-numeric: tabular-nums;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const EmptyLine = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-radius: 9px;
  border: 1px dashed ${({ theme }) => theme.colors.border.default};
  background: none;
  color: ${({ theme }) => theme.colors.text.tertiary};
  font-size: 12.5px;
  cursor: pointer;

  svg {
    width: 14px;
    height: 14px;
  }

  &:hover {
    background: ${({ theme }) => theme.colors.hover};
  }
`

const EmptyLineCta = styled.span`
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.secondary};
`
