import type { CurrentCabinetSummary } from '../../model/use-country-dashboard-stats'
import { IconBriefcase } from '../country-detail-dashboard.icons'
import * as S from '../country-detail-dashboard.styles'
import { defaultPartyColor, formatStartDate } from './format'

export interface GovernmentCardProps {
  cabinet: CurrentCabinetSummary | null
  isLoading: boolean
  onOpen: () => void
}

export function GovernmentCard({
  cabinet,
  isLoading,
  onOpen,
}: GovernmentCardProps) {
  return (
    <S.CardPanel $accent="rose">
      <S.CardPanelTitleRow>
        <S.CardPanelTitle>현 정부</S.CardPanelTitle>
        {cabinet?.ministerCount != null && cabinet.ministerCount > 0 && (
          <S.CardPanelHint>{cabinet.ministerCount}명 각료</S.CardPanelHint>
        )}
      </S.CardPanelTitleRow>
      {isLoading ? (
        <S.FeedEmpty>불러오는 중...</S.FeedEmpty>
      ) : cabinet == null ? (
        <S.EmptyWithCta>
          <S.FeedEmpty>현재 활성 행정부(Cabinet)가 없습니다.</S.FeedEmpty>
          <S.EmptyCtaButton type="button" onClick={onOpen}>
            <IconBriefcase />
            정부 탭에서 등록
          </S.EmptyCtaButton>
        </S.EmptyWithCta>
      ) : (
        <>
          <S.GovHeadingBlock>
            <S.FeaturedName>{cabinet.name}</S.FeaturedName>
            {cabinet.startDate && (
              <S.GovStartDate>
                {formatStartDate(cabinet.startDate)} 출범
              </S.GovStartDate>
            )}
          </S.GovHeadingBlock>
          {cabinet.partyDistribution.length > 0 ? (
            <PartyDistribution
              parties={cabinet.partyDistribution}
            />
          ) : cabinet.ministerCount === 0 ? (
            <S.FeedEmpty>각료 등록 전</S.FeedEmpty>
          ) : (
            <S.HeadMeta>정당 정보 미등록</S.HeadMeta>
          )}
        </>
      )}
    </S.CardPanel>
  )
}

function PartyDistribution({
  parties,
}: {
  parties: CurrentCabinetSummary['partyDistribution']
}) {
  const total = parties.reduce((s, p) => s + p.count, 0)
  if (total === 0) return null
  return (
    <>
      <S.PartyBarTrack aria-hidden>
        {parties.map((p, i) => {
          const w = (p.count / total) * 100
          return (
            <S.PartyBarSeg
              key={`${p.partyId ?? p.partyName}-${i}`}
              $color={p.color ?? defaultPartyColor(i)}
              style={{ width: `${w}%` }}
            />
          )
        })}
      </S.PartyBarTrack>
      <S.PartyList>
        {parties.map((p, i) => {
          const pct = Math.round((p.count / total) * 100)
          return (
            <S.PartyRow key={`${p.partyId ?? p.partyName}-${i}`}>
              <S.PartySwatch $color={p.color ?? defaultPartyColor(i)} />
              <S.PartyName>{p.partyName}</S.PartyName>
              <S.PartyShare>{pct}%</S.PartyShare>
            </S.PartyRow>
          )
        })}
      </S.PartyList>
    </>
  )
}
