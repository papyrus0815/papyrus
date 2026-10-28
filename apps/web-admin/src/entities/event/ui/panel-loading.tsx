/**
 * 사건 상세 탭 안의 로딩 — 패널 **정중앙**의 얇은 바 + 한 줄 안내.
 *
 * 조망 탭은 청크 받기(Suspense) → 데이터 받기(useQuery) 두 단계를 기다리는데, 둘 다 패널 왼쪽 위의
 * 13px 회색 글자 한 줄이라 로딩인지 빈 화면인지 알기 어려웠다. 두 단계가 이 부품 하나를 써서
 * 같은 자리·같은 모양으로 이어진다. 바 모양은 상세 진입 로딩(detail-loading)과 같은 무채색 2px.
 *
 * - 패널은 높이가 정해져 있지 않아 최소 높이를 주고 그 안에서 가운데에 둔다.
 * - 빠른 응답엔 번쩍이지 않도록 짧은 지연 뒤에 나타난다(지연 동안 투명).
 */
import React from 'react'

import styled, { keyframes } from 'styled-components'

import { ledgerHairlineStrong } from './ledger-tokens'

/** 이보다 빠른 응답엔 아무것도 안 보인다 */
const APPEAR_DELAY_MS = 150

export function EventPanelLoading({ label }: { label: string }) {
  return (
    <Stage role="status" aria-live="polite" aria-busy="true">
      <Bar aria-hidden>
        <BarFill />
      </Bar>
      <Label>{label}</Label>
    </Stage>
  )
}

const fadeIn = keyframes`
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
`

const slide = keyframes`
  from {
    transform: translateX(-100%);
  }
  to {
    transform: translateX(250%);
  }
`

const Stage = styled.div`
  box-sizing: border-box;
  width: 100%;
  min-height: clamp(240px, 55vh, 560px);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 14px;
  /* 아래를 조금 더 비워 시각 중심(기하 중심보다 약간 위)에 맞춘다 */
  padding: 24px 24px 48px;
  /* both — 지연 동안에도 첫 키프레임(투명)에 머문다 */
  animation: ${fadeIn} 0.2s ease-out ${APPEAR_DELAY_MS}ms both;

  @media (prefers-reduced-motion: reduce) {
    animation-duration: 0.01s;
  }
`

const Bar = styled.div`
  width: 120px;
  height: 2px;
  border-radius: 2px;
  overflow: hidden;
  background: ${({ theme }) => ledgerHairlineStrong(theme.mode)};
`

const BarFill = styled.div`
  width: 40%;
  height: 100%;
  border-radius: 2px;
  background: ${({ theme }) => theme.colors.text.secondary};
  transform: translateX(-100%);

  @media (prefers-reduced-motion: no-preference) {
    animation: ${slide} 1.3s cubic-bezier(0.45, 0, 0.25, 1) infinite;
  }

  @media (prefers-reduced-motion: reduce) {
    width: 100%;
    transform: none;
    opacity: 0.35;
  }
`

const Label = styled.p`
  margin: 0;
  font-size: 13px;
  color: ${({ theme }) => theme.colors.text.tertiary};
`
