import { type ReactNode } from 'react'

import styled from 'styled-components'

import {
  ledgerAccent,
  ledgerHairline,
  ledgerHairlineStrong,
} from '@/entities/event/ui/ledger-tokens'
import { metaText } from '@/pages/events/styles/theme'

/**
 * 연관 탭의 구역 — **하위 사건**과 **관련 사건**(원인·결과로 이어진 다른 사건)을
 * 좌측 기준선 정렬과 하단 헤어라인 머리글로 깔끔하게 구분한다.
 */

export type NetworkZoneKind = 'hierarchy' | 'related'

interface NetworkZoneProps {
  kind: NetworkZoneKind
  icon: ReactNode
  title: string
  /** 제목 요소 id — 안쪽 블록이 aria-labelledby로 가리킨다 */
  titleId: string
  /** 한 줄 뜻 */
  description: string
  /** 제목 옆 — 도움말 '?' 등 */
  extra?: ReactNode
  /** 구역 헤더 우측 실행 버튼 슬롯 */
  actions?: ReactNode
  children: ReactNode
}

export function NetworkZone({
  kind,
  icon,
  title,
  titleId,
  description,
  extra,
  actions,
  children,
}: NetworkZoneProps) {
  return (
    <Zone $kind={kind} aria-labelledby={titleId}>
      <Head>
        <HeadLeft>
          <HeadText>
            <TitleRow>
              <IconGlyph $kind={kind} aria-hidden>
                {icon}
              </IconGlyph>
              <Title id={titleId}>{title}</Title>
              {extra}
            </TitleRow>
            <Description>{description}</Description>
          </HeadText>
        </HeadLeft>
        {actions && <HeadActions>{actions}</HeadActions>}
      </Head>
      <Body>{children}</Body>
    </Zone>
  )
}

const neutralInk = ({ theme }: { theme: { mode: string } }) =>
  theme.mode === 'dark' ? '#cbd5e1' : '#475569'

const Zone = styled.section<{ $kind: NetworkZoneKind }>`
  display: flex;
  flex-direction: column;
  gap: 24px;
`

const Head = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 10px 16px;
  padding-bottom: 16px;
  border-bottom: 1px solid ${({ theme }) => ledgerHairlineStrong(theme.mode)};
`

const HeadLeft = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 10px;
  min-width: 0;
  flex: 1 1 240px;
`

const HeadActions = styled.div`
  display: inline-flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
`

const IconGlyph = styled.span<{ $kind: NetworkZoneKind }>`
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 15px;
  color: ${({ $kind, theme }) =>
    $kind === 'related' ? ledgerAccent(theme.mode) : neutralInk({ theme })};
`

const HeadText = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
`

const TitleRow = styled.div`
  display: flex;
  align-items: center;
  gap: 7px;
`

const Title = styled.h3`
  margin: 0;
  font-size: 16px;
  font-weight: 700;
  letter-spacing: -0.012em;
  line-height: 1.35;
  color: ${({ theme }) => theme.colors.text.primary};
`

const Description = styled.p`
  margin: 0;
  font-size: 12.5px;
  line-height: 1.5;
  color: ${metaText};
`

const Body = styled.div`
  display: flex;
  flex-direction: column;
  gap: 20px;
`

/** 구역 뒤 꼬리(키워드·연결 추가) — 앞 구역과 충분한 여백·헤어라인으로 분리 */
export const ZoneTail = styled.div`
  display: flex;
  flex-direction: column;
  gap: 36px;
  padding-top: 40px;
  border-top: 1px solid ${({ theme }) => ledgerHairlineStrong(theme.mode)};

  &:empty {
    display: none;
  }
`
