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
}

export function ElectionCard({
  next,
  recent,
  isLoading,
  onOpen,
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
  return (
    <S.CardPanel $accent="indigo">
      <S.CardPanelTitleRow>
        <S.CardPanelTitle>{next ? '다음 선거' : '최근 선거'}</S.CardPanelTitle>
      </S.CardPanelTitleRow>
      {next ? (
        <>
          <S.ElectionDay>{formatDDay(next.pollDate)}</S.ElectionDay>
          <S.ElectionMeta>
            <S.ElectionName title={next.name}>{next.name}</S.ElectionName>
            <span>{formatStartDate(next.pollDate)}</span>
          </S.ElectionMeta>
        </>
      ) : recent ? (
        <>
          <S.ElectionDay $past>
            {formatDaysAgo(recent.pollDate)}
          </S.ElectionDay>
          <S.ElectionMeta>
            <S.ElectionName title={recent.name}>{recent.name}</S.ElectionName>
            <span>{formatStartDate(recent.pollDate)}</span>
          </S.ElectionMeta>
        </>
      ) : null}
    </S.CardPanel>
  )
}

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
