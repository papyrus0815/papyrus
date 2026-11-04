import { type ReactNode } from 'react'

import styled, { css } from 'styled-components'

import { ledgerAccent, withAlpha } from '@/entities/event/ui/ledger-tokens'
import { metaText } from '@/pages/events/styles/theme'

/**
 * 연관 탭의 구역 — **소속**(상위·하위: 어느 묶음 안에 있나)과 **관련 사건**(원인·결과로 이어진 다른 사건)을
 * 한눈에 갈라 놓는다. 예전엔 '상위 사건'·'관련 사건'이 같은 11px 회색 라벨로 위아래에 붙어 있어
 * 둘이 다른 종류의 연결이라는 게 보이지 않았다.
 *
 * 상자로 감싸지 않는다(중첩 카드 박스는 걷어 낸 문법) — 구역 머리(아이콘·제목·한 줄 뜻)와
 * 왼쪽 세로선의 색으로 가른다: 소속은 중립 회색(나무 줄기), 관련 사건은 강조색(화살표와 같은 색).
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
  children: ReactNode
}

export function NetworkZone({ kind, icon, title, titleId, description, extra, children }: NetworkZoneProps) {
  return (
    <Zone $kind={kind} aria-labelledby={titleId}>
      <Head>
        <IconBadge $kind={kind} aria-hidden>
          {icon}
        </IconBadge>
        <HeadText>
          <TitleRow>
            <Title id={titleId}>{title}</Title>
            {extra}
          </TitleRow>
          <Description>{description}</Description>
        </HeadText>
      </Head>
      <Body $kind={kind}>{children}</Body>
    </Zone>
  )
}

const neutralInk = ({ theme }: { theme: { mode: string } }) => (theme.mode === 'dark' ? '#cbd5e1' : '#475569')

const Zone = styled.section<{ $kind: NetworkZoneKind }>`
  display: flex;
  flex-direction: column;
  gap: 14px;

  /* 구역 사이 — 한 줄 구분선과 넉넉한 숨 */
  & + & {
    margin-top: 10px;
    padding-top: 22px;
    border-top: 1px solid ${({ theme }) => theme.colors.border.default};
  }
`

const Head = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 10px;
`

const IconBadge = styled.span<{ $kind: NetworkZoneKind }>`
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 8px;
  font-size: 15px;

  ${({ $kind, theme }) =>
    $kind === 'related'
      ? css`
          color: ${ledgerAccent(theme.mode)};
          background: ${withAlpha(ledgerAccent(theme.mode), theme.mode === 'dark' ? 0.2 : 0.1)};
        `
      : css`
          color: ${neutralInk({ theme })};
          background: ${theme.mode === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(15,23,42,0.06)'};
        `}
`

const HeadText = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1px;
  min-width: 0;
`

const TitleRow = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
`

const Title = styled.h3`
  margin: 0;
  font-size: 15px;
  font-weight: 700;
  line-height: 1.4;
  color: ${({ theme }) => theme.colors.text.primary};
`

const Description = styled.p`
  margin: 0;
  font-size: 12.5px;
  line-height: 1.45;
  color: ${metaText};
`

/** 구역 본문 — 왼쪽 세로선이 구역의 종류를 말한다(아이콘 가운데 줄에 맞춰 13px 들임) */
const Body = styled.div<{ $kind: NetworkZoneKind }>`
  display: flex;
  flex-direction: column;
  gap: 18px;
  margin-left: 13px;
  padding-left: 23px;
  border-left: 2px solid
    ${({ $kind, theme }) =>
      $kind === 'related'
        ? withAlpha(ledgerAccent(theme.mode), theme.mode === 'dark' ? 0.45 : 0.35)
        : theme.mode === 'dark'
          ? 'rgba(255,255,255,0.14)'
          : 'rgba(15,23,42,0.12)'};

  @media (max-width: 639px) {
    margin-left: 0;
    padding-left: 12px;
  }
`

/** 구역 뒤 꼬리(키워드·연결 추가) — 마지막 구역과 같은 구분선으로 떼어 그 구역 일부로 읽히지 않게 */
export const ZoneTail = styled.div`
  display: flex;
  flex-direction: column;
  gap: 14px;

  ${Zone} + & {
    margin-top: 10px;
    padding-top: 22px;
    border-top: 1px solid ${({ theme }) => theme.colors.border.default};
  }
`
