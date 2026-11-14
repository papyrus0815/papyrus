import styled from 'styled-components'

import { RADIUS, ledgerAccent } from '@/entities/event/ui/ledger-tokens'

interface LoadErrorProps {
  /** 무엇을 못 불러왔는지 — 문장 전체('투입 부대를 불러오지 못했습니다') */
  message: string
  onRetry?: () => void
  retrying?: boolean
}

/**
 * 조회 실패 — **빈 상태와 다른 모양**으로 말한다.
 *
 * 예전엔 조회를 `.catch(() => [])`로 삼켜 실패가 '아직 없습니다'로 보였다(2026-11-14 실측: 서버가
 * 500을 내는데 독소전쟁 전투서열은 '투입된 군사 부대가 없습니다', 총통 지령 제21호의 기관 연결은 빈 '연결' 버튼).
 * 있는 기록을 없다고 말하면 다시 등록하게 만든다 — 실패는 실패로, 다시 시도와 함께 보인다.
 */
export function LoadError({ message, onRetry, retrying = false }: LoadErrorProps) {
  return (
    <Box role="alert">
      <span>{message}</span>
      {onRetry && (
        <RetryButton type="button" onClick={onRetry} disabled={retrying}>
          {retrying ? '다시 불러오는 중…' : '다시 시도'}
        </RetryButton>
      )}
    </Box>
  )
}

const Box = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px 12px;
  padding: 8px 12px;
  border-radius: ${RADIUS.MD};
  border: 1px solid ${({ theme }) => theme.colors.error};
  background: ${({ theme }) => (theme.mode === 'dark' ? 'rgba(239, 68, 68, 0.12)' : 'rgba(239, 68, 68, 0.06)')};
  color: ${({ theme }) => theme.colors.text.primary};
  font-size: 12.5px;
  line-height: 1.6;
  word-break: keep-all;
`

const RetryButton = styled.button`
  padding: 0;
  border: none;
  background: none;
  color: ${({ theme }) => ledgerAccent(theme.mode)};
  font: inherit;
  font-weight: 700;
  text-decoration: underline;
  text-underline-offset: 2px;
  cursor: pointer;

  &:disabled {
    cursor: progress;
    text-decoration: none;
    opacity: 0.7;
  }
`
