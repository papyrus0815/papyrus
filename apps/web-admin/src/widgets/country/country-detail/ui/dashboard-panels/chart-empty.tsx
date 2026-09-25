import type { ReactNode } from 'react'

import styled from 'styled-components'

interface Props {
  /** 자료가 없을 때도 남는 그래프 골격 — 축·눈금선·라벨만 있고 값은 없다 */
  children: ReactNode
  text: string
  actionLabel: string
  onAction: () => void
}

/**
 * 그래프가 있는 섹션의 빈 상태.
 *
 * 안내문 한 줄로 그래프를 **대체**하면 이 자리에 무엇이 그려지는지 글로 설명해야 하고,
 * 자료가 들어온 뒤의 화면과 생김새가 전혀 달라 지면이 매번 다른 모양이 된다.
 * 그래서 골격은 그대로 두고 값만 비운다 — 축과 눈금선, 연령대·연도 같은 **이미 아는
 * 라벨**은 그리고, **없는 값을 지어내지 않는다**(눈금 숫자를 채우면 거짓이 된다).
 *
 * 골격은 흐리게 깔고 낭독에서도 제외한다(aria-hidden) — 읽을 값이 없기 때문이다.
 */
export function ChartEmpty({ children, text, actionLabel, onAction }: Props) {
  return (
    <Box>
      <Skeleton aria-hidden="true">{children}</Skeleton>
      <Overlay>
        {/*
          안내는 카드에 올린다. 예전엔 글자가 골격의 눈금선·막대·달력 칸 위에 그대로
          얹혀 선이 글자를 가로질렀다(교역에선 막대 트랙 세 줄 사이에 문장이 끼었다).
        */}
        <Note>
          <NoteIcon aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 3v18h18" />
              <path d="M7 15l4-4 3 3 5-6" />
            </svg>
          </NoteIcon>
          <Text>{text}</Text>
          <Action type="button" onClick={onAction}>
            + {actionLabel}
          </Action>
        </Note>
      </Overlay>
    </Box>
  )
}

const Box = styled.div`
  position: relative;
  width: 100%;
  min-height: 180px;
`

const Skeleton = styled.div`
  /*
   * 골격은 '이 자리에 이런 모양이 선다'만 말하면 된다. 너무 흐리면 빈칸으로, 너무
   * 진하면 자료가 있는 그래프로 읽힌다 — 무채색으로 누르고 가장자리를 녹여, 안내
   * 카드가 주인공이 되게 한다.
   */
  opacity: ${({ theme }) => (theme.mode === 'dark' ? 0.5 : 0.6)};
  filter: grayscale(1);
  pointer-events: none;
  user-select: none;
  mask-image: radial-gradient(
    ellipse 75% 85% at 50% 50%,
    rgba(0, 0, 0, 0.35) 0%,
    #000 70%
  );
`

const Overlay = styled.div`
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
`

const Note = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  max-width: 420px;
  padding: 18px 22px 16px;
  border-radius: 14px;
  text-align: center;
  border: 1px solid ${({ theme }) => theme.colors.border.light};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(28,28,30,0.92)' : 'rgba(255,255,255,0.94)'};
  box-shadow: ${({ theme }) =>
    theme.mode === 'dark'
      ? '0 8px 24px rgba(0,0,0,0.35)'
      : '0 1px 2px rgba(15,23,42,0.04), 0 8px 24px rgba(15,23,42,0.07)'};
  backdrop-filter: blur(6px);
  -webkit-backdrop-filter: blur(6px);
`

const NoteIcon = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  border-radius: 9px;
  color: ${({ theme }) => theme.colors.text.secondary};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(15,23,42,0.045)'};

  svg {
    width: 16px;
    height: 16px;
  }
`

const Text = styled.p`
  margin: 0;
  font-size: 13px;
  line-height: 1.6;
  color: ${({ theme }) => theme.colors.text.secondary};
  word-break: keep-all;
`

const Action = styled.button`
  padding: 8px 16px;
  border-radius: 9px;
  border: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(99,106,242,0.45)' : 'rgba(56,130,246,0.35)'};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(99,106,242,0.22)' : 'rgba(56,130,246,0.11)'};
  color: ${({ theme }) => (theme.mode === 'dark' ? '#a5b4fc' : '#2563eb')};
  font-size: 12.5px;
  font-weight: 700;
  cursor: pointer;

  &:hover {
    background: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(99,106,242,0.32)' : 'rgba(56,130,246,0.19)'};
  }
  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.active};
    outline-offset: 2px;
  }
`
