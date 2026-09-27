/**
 * 사건 등록 폼 로딩 — 모달 본문 가운데 **도는 링** + 한 줄 상태.
 *
 * 폼 청크(lazy)를 받는 동안과 수정 모드에서 사건을 불러오는 동안 쓴다. 예전엔 빈 모달 가운데
 * 13px 글자 한 줄이라 멈춘 화면처럼 읽혔다(사용자 지시: "로딩바가 돌아야 한다").
 * - 빠른 로드에서 번쩍이지 않게 150ms 뒤에 나타난다.
 * - reduced-motion이어도 회전은 유지하되 느리게 — 진행 중이라는 신호 자체가 정보다.
 */
import React from 'react'

import styled, { keyframes } from 'styled-components'

export const EventFormLoading: React.FC<{ label?: string }> = ({
  label = '폼을 불러오는 중',
}) => (
  <Root role="status" aria-live="polite">
    <Spinner aria-hidden="true" />
    <Label>{label}</Label>
  </Root>
)

const appear = keyframes`
  from { opacity: 0; }
  to { opacity: 1; }
`

const spin = keyframes`
  to { transform: rotate(360deg); }
`

const Root = styled.div`
  flex: 1;
  /* 모달 본문(약 560px)의 세로 가운데에 오도록 — 스크롤 영역이 자식을 늘여 주지 않는다 */
  min-height: min(520px, 62vh);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 14px;
  opacity: 0;
  animation: ${appear} 0.2s ease 0.15s forwards;
`

const Spinner = styled.span`
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: 3px solid
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(15, 23, 42, 0.08)'};
  border-top-color: ${({ theme }) => theme.colors.primary};
  animation: ${spin} 0.8s linear infinite;

  @media (prefers-reduced-motion: reduce) {
    animation-duration: 2s;
  }
`

const Label = styled.span`
  font-size: 13px;
  font-weight: 500;
  color: ${({ theme }) => theme.colors.text.secondary};
`
