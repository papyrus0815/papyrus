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
        <Text>{text}</Text>
        <Action type="button" onClick={onAction}>
          + {actionLabel}
        </Action>
      </Overlay>
    </Box>
  )
}

const Box = styled.div`
  position: relative;
  width: 100%;
`

const Skeleton = styled.div`
  /* 너무 흐리면 골격이 아니라 빈칸으로 보인다 — 축과 눈금선이 읽힐 만큼은 남긴다 */
  opacity: ${({ theme }) => (theme.mode === 'dark' ? 0.6 : 0.72)};
  filter: grayscale(1);
  pointer-events: none;
  user-select: none;
`

const Overlay = styled.div`
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 16px;
  text-align: center;
`

const Text = styled.p`
  margin: 0;
  max-width: 460px;
  font-size: 13px;
  line-height: 1.6;
  color: ${({ theme }) => theme.colors.text.secondary};
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
`
