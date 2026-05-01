import { getUploadImageUrl } from '@/shared/api/upload'

import type { CurrentHead } from '../../model/use-country-dashboard-stats'
import { IconBriefcase } from '../country-detail-dashboard.icons'
import * as S from '../country-detail-dashboard.styles'
import { formatStartDate, formatTenure } from './format'

export interface CurrentHeadsPanelProps {
  heads: CurrentHead[]
  isLoading: boolean
  onSelect: (personId: string) => void
  onRegister: () => void
}

export function CurrentHeadsPanel({
  heads,
  isLoading,
  onSelect,
  onRegister,
}: CurrentHeadsPanelProps) {
  const featured = heads[0]
  const rest = heads.slice(1)
  return (
    <S.CardPanel $accent="violet">
      <S.CardPanelTitleRow>
        <S.CardPanelTitle>현임 정부 수반</S.CardPanelTitle>
        <S.CardPanelHint>
          {heads.length > 0 ? `${heads.length}명 재임 중` : ''}
        </S.CardPanelHint>
      </S.CardPanelTitleRow>

      {heads.length === 0 ? (
        isLoading ? (
          <S.FeedEmpty>불러오는 중...</S.FeedEmpty>
        ) : (
          <S.EmptyWithCta>
            <S.FeedEmpty>
              현재 재임 중인 국가원수·정부수반이 등록되어 있지 않습니다.
            </S.FeedEmpty>
            <S.EmptyCtaButton type="button" onClick={onRegister}>
              <IconBriefcase />
              정부 탭에서 등록
            </S.EmptyCtaButton>
          </S.EmptyWithCta>
        )
      ) : (
        <S.HeadsLayout>
          {featured && (
            <S.FeaturedHeadCard
              type="button"
              onClick={() => featured.personId && onSelect(featured.personId)}
              disabled={!featured.personId}
            >
              <S.FeaturedAvatar>
                {featured.profileImageUrl ? (
                  <img
                    src={getUploadImageUrl(featured.profileImageUrl)}
                    alt=""
                  />
                ) : (
                  <span>👤</span>
                )}
              </S.FeaturedAvatar>
              <S.FeaturedMain>
                <S.PositionBadge>
                  {featured.positionType === 'HEAD_OF_STATE'
                    ? '국가원수'
                    : '정부수반'}
                </S.PositionBadge>
                <S.FeaturedName>{featured.personName}</S.FeaturedName>
                <S.FeaturedMetaRow>
                  <span>{featured.positionTitle}</span>
                  <S.FeaturedMetaSep>·</S.FeaturedMetaSep>
                  <span>{formatTenure(featured.startDate)}</span>
                </S.FeaturedMetaRow>
              </S.FeaturedMain>
            </S.FeaturedHeadCard>
          )}
          {rest.length > 0 && (
            <S.HeadList>
              {rest.map((h) => (
                <li key={h.tenureId}>
                  <S.HeadRow
                    type="button"
                    onClick={() => h.personId && onSelect(h.personId)}
                    disabled={!h.personId}
                  >
                    <S.HeadAvatar>
                      {h.profileImageUrl ? (
                        <img src={getUploadImageUrl(h.profileImageUrl)} alt="" />
                      ) : (
                        <span>👤</span>
                      )}
                    </S.HeadAvatar>
                    <S.HeadMain>
                      <S.HeadName>{h.personName}</S.HeadName>
                      <S.HeadMeta>
                        {h.positionTitle} · 재임 {formatStartDate(h.startDate)}~
                      </S.HeadMeta>
                    </S.HeadMain>
                  </S.HeadRow>
                </li>
              ))}
            </S.HeadList>
          )}
        </S.HeadsLayout>
      )}
    </S.CardPanel>
  )
}
