import styled from 'styled-components'

import { formatDateWithPrecision } from '@/pages/events/utils/events.utils'

import * as S from '../styles'
import { type EventDetail } from '../use-event-detail'
import { MODULE_COLOR } from './module-colors'

interface ModuleTreatiesProps {
  event: EventDetail
}

const TREATY_TYPE_LABEL: Record<string, string> = {
  'non-aggression': '불가침',
  alliance: '동맹',
  trade: '통상',
  territorial: '영토',
  other: '기타',
}

/**
 * 조약 — `belligerents.metadata.treaties[]`. signDate 기준 정렬.
 *
 * 각 조약은 carded surface 대신 hairline-bordered row + dl로 정리. 본문 흐름과 톤 통일.
 */
export function ModuleTreaties({ event }: ModuleTreatiesProps) {
  const treaties = event.belligerents?.metadata?.treaties ?? []
  if (treaties.length === 0) return null

  const sorted = [...treaties].sort(
    (a, b) => new Date(a.signDate).getTime() - new Date(b.signDate).getTime(),
  )

  return (
    <S.Section id="module-treaties">
      <S.SectionHeader>
        <S.SectionTitle>
          <S.SectionTitleDot $color={MODULE_COLOR.treaties} />
          조약
        </S.SectionTitle>
        <S.SectionSubtitle>{treaties.length}건</S.SectionSubtitle>
      </S.SectionHeader>

      <Stack>
        {sorted.map((treaty) => (
          <TreatyBlock key={treaty.id}>
            <TreatyHead>
              <TreatyName>{treaty.name}</TreatyName>
              <S.Tag>{TREATY_TYPE_LABEL[treaty.type] ?? treaty.type}</S.Tag>
            </TreatyHead>

            <S.Definitions>
              <S.DefRow>
                <S.DefLabel>체결</S.DefLabel>
                <S.DefValue>{formatDateWithPrecision(treaty.signDate)}</S.DefValue>
              </S.DefRow>
              {treaty.expiryDate && (
                <S.DefRow>
                  <S.DefLabel>만료</S.DefLabel>
                  <S.DefValue>{formatDateWithPrecision(treaty.expiryDate)}</S.DefValue>
                </S.DefRow>
              )}
              {treaty.violationDate && (
                <S.DefRow>
                  <S.DefLabel>파기</S.DefLabel>
                  <ViolationValue>
                    {formatDateWithPrecision(treaty.violationDate)}
                  </ViolationValue>
                </S.DefRow>
              )}
              {treaty.signatories.length > 0 && (
                <S.DefRow>
                  <S.DefLabel>서명국</S.DefLabel>
                  <S.DefValue>
                    <S.TagRow>
                      {treaty.signatories.map((sig, idx) => (
                        <S.Tag key={`${sig}-${idx}`}>{sig}</S.Tag>
                      ))}
                    </S.TagRow>
                  </S.DefValue>
                </S.DefRow>
              )}
            </S.Definitions>

            {treaty.terms.length > 0 && (
              <Terms>
                {treaty.terms.map((term, idx) => (
                  <li key={idx}>{term}</li>
                ))}
              </Terms>
            )}

            {treaty.description && <Body>{treaty.description}</Body>}
          </TreatyBlock>
        ))}
      </Stack>
    </S.Section>
  )
}

const Stack = styled.div`
  display: flex;
  flex-direction: column;
  gap: 22px;
`

const TreatyBlock = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
`

const TreatyHead = styled.div`
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
`

const TreatyName = styled.h3`
  margin: 0;
  font-size: 16px;
  font-weight: 700;
  letter-spacing: -0.005em;
  color: ${({ theme }) => theme.colors.text.primary};
`

const ViolationValue = styled.dd`
  margin: 0;
  font-size: 14px;
  line-height: 1.6;
  color: ${({ theme }) => theme.colors.error};
`

const Terms = styled.ul`
  margin: 4px 0 0;
  padding-left: 18px;
  font-size: 13.5px;
  line-height: 1.6;
  color: ${({ theme }) => theme.colors.text.primary};
  display: flex;
  flex-direction: column;
  gap: 3px;
`

const Body = styled.p`
  margin: 0;
  font-size: 13.5px;
  line-height: 1.65;
  color: ${({ theme }) => theme.colors.text.secondary};
`
