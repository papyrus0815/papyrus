import styled from 'styled-components'

interface Props {
  /** 이 자리에 무엇이 들어오는지 — '없습니다'로 끝내지 않고 무엇을 넣으면 뭐가 보이는지까지 */
  text: string
  actionLabel: string
  onAction: () => void
  /** 부차 진입(전체 목록으로 가기 등) */
  secondaryLabel?: string
  onSecondary?: () => void
  /** 차트/시각화 활성화 요건이나 작성 팁 (예: '최소 2개 연도 입력 시 추이선 생성') */
  hint?: string
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
  hint,
}: Props) {
  return (
    <Box>
      <TextColumn>
        <Text>{text}</Text>
        {hint && (
          <HintRow>
            <HintBadge>TIP</HintBadge>
            <HintText>{hint}</HintText>
          </HintRow>
        )}
      </TextColumn>
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
  gap: 12px 20px;
  min-height: 72px;
  box-sizing: border-box;
  padding: 16px 20px;
  border: 1px dashed ${({ theme }) => theme.colors.border.medium};
  border-radius: 12px;
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.02)' : 'rgba(15,23,42,0.015)'};
`

const TextColumn = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
  flex: 1 1 240px;
  min-width: 0;
`

const Text = styled.p`
  margin: 0;
  min-width: 0;
  font-size: 13px;
  line-height: 1.55;
  word-break: keep-all;
  color: ${({ theme }) => theme.colors.text.secondary};
`

const HintRow = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 11.5px;
  line-height: 1.4;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const HintBadge = styled.span`
  flex-shrink: 0;
  padding: 1px 5px;
  border-radius: 4px;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.04em;
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(99,102,241,0.18)' : 'rgba(99,102,241,0.10)'};
  color: ${({ theme }) => (theme.mode === 'dark' ? '#a5b4fc' : '#4f46e5')};
`

const HintText = styled.span`
  word-break: keep-all;
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
      theme.mode === 'dark' ? 'rgba(99,102,241,0.45)' : 'rgba(99,102,241,0.32)'};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(99,102,241,0.18)' : 'rgba(99,102,241,0.10)'};
  color: ${({ theme }) => (theme.mode === 'dark' ? '#a5b4fc' : '#4f46e5')};
  font-size: 12.5px;
  font-weight: 700;
  white-space: nowrap;
  cursor: pointer;
  transition:
    background 0.15s ease,
    border-color 0.15s ease;

  &:hover {
    background: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(99,102,241,0.28)' : 'rgba(99,102,241,0.18)'};
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
