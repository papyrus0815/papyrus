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
  if (!next && !recent) {
    return (
      <S.CardPanel $accent="indigo">
        <S.CardPanelTitleRow>
          <S.CardPanelTitle>선거</S.CardPanelTitle>
        </S.CardPanelTitleRow>
        <S.EmptyWithCta>
          <S.FeedEmpty>등록된 선거가 없습니다.</S.FeedEmpty>
          <S.EmptyCtaButton type="button" onClick={onOpen}>
            <IconVote />
            선거 탭으로
          </S.EmptyCtaButton>
        </S.EmptyWithCta>
      </S.CardPanel>
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
