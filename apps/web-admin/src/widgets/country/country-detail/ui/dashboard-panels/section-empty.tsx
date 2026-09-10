import styled from 'styled-components'

interface Props {
  /** 이 자리에 무엇이 들어오는지 — '없습니다'로 끝내지 않고 무엇을 넣으면 뭐가 보이는지까지 */
  text: string
  actionLabel: string
  onAction: () => void
  /** 부차 진입(전체 목록으로 가기 등) */
  secondaryLabel?: string
  onSecondary?: () => void
}

/**
 * 섹션의 빈 자리.
 *
 * 예전엔 자료가 없는 섹션을 통째로 감췄다. 실DB에서 인구 피라미드는 71개국 중 1개국,
 * 경제 지표는 0행이라 거의 모든 국가에서 그 섹션들이 아예 없는 것처럼 보였고, 등록
 * 입구도 한 줄짜리 안내로 접혀 있어 "그런 기능이 없다"로 읽혔다.
 *
 * 그렇다고 예전처럼 «등록된 …이 없습니다»만 남기면 지면이 '없음'의 나열이 된다.
 * 그래서 빈 자리는 **세 가지를 한 번에** 말한다 — 여기가 무엇의 자리인지(섹션 제목이
 * 이미 말한다), 넣으면 무엇이 보이는지, 그리고 지금 바로 넣는 버튼.
 * 높이는 한 뼘으로 묶어 빈 섹션이 화면을 먹지 않게 한다.
 */
export function SectionEmpty({
  text,
  actionLabel,
  onAction,
  secondaryLabel,
  onSecondary,
}: Props) {
  return (
    <Box>
      <Text>{text}</Text>
      <Actions>
        <Primary type="button" onClick={onAction}>
          + {actionLabel}
        </Primary>
        {secondaryLabel && onSecondary && (
          <Secondary type="button" onClick={onSecondary}>
            {secondaryLabel}
          </Secondary>
        )}
      </Actions>
    </Box>
  )
}

const Box = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 10px 20px;
  padding: 16px 18px;
  /* 파선 테두리 = '아직 비어 있는 자리' — 채워지면 실선 카드들로 바뀐다 */
  border: 1px dashed ${({ theme }) => theme.colors.border.medium};
  border-radius: 12px;
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.02)' : 'rgba(15,23,42,0.015)'};
`

const Text = styled.p`
  margin: 0;
  flex: 1 1 320px;
  min-width: 0;
  font-size: 13px;
  line-height: 1.6;
  color: ${({ theme }) => theme.colors.text.secondary};
`

const Actions = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
`

const Primary = styled.button`
  padding: 7px 14px;
  border-radius: 8px;
  border: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(99,106,242,0.45)' : 'rgba(56,130,246,0.35)'};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(99,106,242,0.18)' : 'rgba(56,130,246,0.09)'};
  color: ${({ theme }) => (theme.mode === 'dark' ? '#a5b4fc' : '#2563eb')};
  font-size: 12.5px;
  font-weight: 700;
  white-space: nowrap;
  cursor: pointer;

  &:hover {
    background: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(99,106,242,0.28)' : 'rgba(56,130,246,0.17)'};
  }
`

const Secondary = styled.button`
  padding: 7px 12px;
  border-radius: 8px;
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  background: transparent;
  color: ${({ theme }) => theme.colors.text.secondary};
  font-size: 12.5px;
  font-weight: 600;
  white-space: nowrap;
  cursor: pointer;

  &:hover {
    color: ${({ theme }) => theme.colors.text.primary};
  }
`
