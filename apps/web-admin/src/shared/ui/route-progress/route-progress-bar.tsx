/**
 * 라우트 전환 로딩바 — 화면 맨 위에 도는 얇은 막대.
 *
 * 라우트가 `lazy`라 첫 진입은 청크를 받는 동안 **이전 화면에 멈춰 있다**(데이터 라우터는
 * 새 라우트가 준비될 때까지 옛 화면을 유지한다). 그 사이 아무 표시가 없으면 클릭이
 * 먹혔는지 알 수 없다 — `useNavigation().state`가 idle이 아닌 동안 막대를 돌린다.
 *
 * 청크가 캐시에 있으면 전환이 수십 ms라 막대가 번쩍이기만 한다 — 짧은 지연 뒤에만 보인다.
 */
import React, { useEffect, useState } from 'react'

import { useNavigation } from 'react-router-dom'
import styled from 'styled-components'

const SHOW_DELAY_MS = 120

export const RouteProgressBar: React.FC = () => {
  const navigation = useNavigation()
  const isPending = navigation.state !== 'idle'
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    if (!isPending) {
      setIsVisible(false)
      return undefined
    }
    const timer = window.setTimeout(() => setIsVisible(true), SHOW_DELAY_MS)
    return () => window.clearTimeout(timer)
  }, [isPending])

  if (!isVisible) return null

  return (
    <Track role="progressbar" aria-label="페이지를 불러오는 중" aria-busy="true">
      <Fill />
    </Track>
  )
}

const Track = styled.div`
  position: fixed;
  top: env(safe-area-inset-top, 0px);
  left: 0;
  right: 0;
  height: 3px;
  z-index: 10000;
  overflow: hidden;
  pointer-events: none;
  background: transparent;
`

const Fill = styled.div`
  height: 100%;
  width: 40%;
  background: ${({ theme }) => theme.colors.primary};
  border-radius: 0 2px 2px 0;
  animation: routeProgressSlide 1.1s ease-in-out infinite;

  @media (prefers-reduced-motion: reduce) {
    width: 100%;
    animation: routeProgressPulse 1.4s ease-in-out infinite;
  }

  @keyframes routeProgressSlide {
    0% {
      transform: translateX(-100%);
    }
    100% {
      transform: translateX(250%);
    }
  }
  @keyframes routeProgressPulse {
    0%,
    100% {
      opacity: 0.35;
    }
    50% {
      opacity: 1;
    }
  }
`
