import styled from 'styled-components'

import * as S from '../styles'
import { type EventDetail } from '../use-event-detail'
import { MODULE_COLOR } from './module-colors'

interface ModuleBelligerentsProps {
  event: EventDetail
}

/**
 * 교전 진영 — 진영별 데이터 표(dl row 기반).
 *
 * 카드 그리드 대신 *제목 + dl rows + 국가 list*를 진영마다 세로로 쌓는다.
 * 카드 surface가 본문 흐름과 충돌하던 문제 해소 — hairline 구분만으로도 충분.
 */
export function ModuleBelligerents({ event }: ModuleBelligerentsProps) {
  const sides = event.belligerents?.sides ?? []
  if (sides.length === 0) return null

  return (
    <S.Section id="module-belligerents">
      <S.SectionHeader>
        <S.SectionTitle>
          <S.SectionTitleDot $color={MODULE_COLOR.belligerents} />
          교전 진영
        </S.SectionTitle>
        <S.SectionSubtitle>{sides.length}개 진영 · 편집은 후속 사이클</S.SectionSubtitle>
      </S.SectionHeader>

      <Stack>
        {sides.map((side, idx) => {
          const countries = (side.countries ?? []) as Array<Record<string, unknown>>
          const sideName =
            typeof side.name === 'string' && side.name.trim().length > 0
              ? side.name
              : `진영 ${idx + 1}`

          return (
            <SideBlock key={`${sideName}-${idx}`}>
              <SideHead>
                <SideName>{sideName}</SideName>
                {side.level && <S.CardMeta>{labelLevel(side.level)}</S.CardMeta>}
              </SideHead>

              {(side.commander || side.forces || side.description) && (
                <S.Definitions>
                  {side.commander && (
                    <S.DefRow>
                      <S.DefLabel>지휘관</S.DefLabel>
                      <S.DefValue>{side.commander}</S.DefValue>
                    </S.DefRow>
                  )}
                  {side.forces && (
                    <S.DefRow>
                      <S.DefLabel>병력</S.DefLabel>
                      <S.DefValue>{side.forces}</S.DefValue>
                    </S.DefRow>
                  )}
                  {side.description && (
                    <S.DefRow>
                      <S.DefLabel>비고</S.DefLabel>
                      <S.DefValue>{side.description}</S.DefValue>
                    </S.DefRow>
                  )}
                </S.Definitions>
              )}

              {countries.length > 0 && (
                <CountryList>
                  {countries.map((country, cidx) => {
                    const name =
                      pickStr(country.name) ??
                      pickStr(country.countryName) ??
                      pickStr(country.historicalCountryName) ??
                      '미상'
                    const detail =
                      pickStr(country.role) ?? pickStr(country.description)
                    return (
                      <li key={cidx}>
                        <CountryName>{name}</CountryName>
                        {detail && <CountryDetail>{detail}</CountryDetail>}
                      </li>
                    )
                  })}
                </CountryList>
              )}
            </SideBlock>
          )
        })}
      </Stack>
    </S.Section>
  )
}

function pickStr(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : undefined
}

function labelLevel(level: string): string {
  if (level === 'coalition') return '연합'
  if (level === 'country') return '국가'
  if (level === 'force') return '부대'
  return level
}

const Stack = styled.div`
  display: flex;
  flex-direction: column;
  gap: 24px;
`

const SideBlock = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
`

const SideHead = styled.div`
  display: flex;
  align-items: baseline;
  gap: 12px;
`

const SideName = styled.h3`
  margin: 0;
  font-size: 16px;
  font-weight: 700;
  letter-spacing: -0.005em;
  color: ${({ theme }) => theme.colors.text.primary};
`

const CountryList = styled.ul`
  list-style: none;
  padding: 0;
  margin: 4px 0 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
`

const CountryName = styled.span`
  font-size: 13px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.primary};
`

const CountryDetail = styled.span`
  font-size: 12px;
  color: ${({ theme }) => theme.colors.text.tertiary};
  margin-left: 6px;
`
