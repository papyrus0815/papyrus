/**
 * 카드 그리드 로딩 스켈레톤 — person-card의 [4:5 초상 + 두 줄 본문] 형태를 모사.
 * 텍스트 "불러오는 중…" 대신 실제 레이아웃을 미리 보여줘 체감 로딩을 매끄럽게.
 */
import styled, { keyframes } from 'styled-components'

import { hairline, surface } from './catalog.styles'
import { EraCardGrid } from './person-card'

interface Props {
  /** 표시할 플레이스홀더 카드 수 */
  count?: number
}

export function CardGridSkeleton({ count = 8 }: Props) {
  return (
    <EraCardGrid aria-hidden role="presentation">
      {Array.from({ length: count }).map((_unused, index) => (
        <SkeletonCard key={index}>
          <SkeletonVisual />
          <SkeletonBody>
            <SkeletonLine style={{ width: '60%', height: 14 }} />
            <SkeletonLine style={{ width: '80%' }} />
          </SkeletonBody>
        </SkeletonCard>
      ))}
    </EraCardGrid>
  )
}

const pulse = keyframes`
  0%, 100% { opacity: 0.55; }
  50% { opacity: 1; }
`

const shimmerBg = (theme: { mode: string }) =>
  theme.mode === 'dark' ? 'rgba(255,255,255,0.08)' : '#eceff3'

const SkeletonCard = styled.div`
  display: flex;
  flex-direction: column;
  border-radius: 14px;
  overflow: hidden;
  border: 1px solid ${hairline};
  background: ${surface};
`

const SkeletonVisual = styled.div`
  aspect-ratio: 4 / 5;
  background: ${({ theme }) => shimmerBg(theme)};
  animation: ${pulse} 1.3s ease-in-out infinite;
  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`

const SkeletonBody = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px 14px 14px;
`

const SkeletonLine = styled.div`
  height: 11px;
  border-radius: 4px;
  background: ${({ theme }) => shimmerBg(theme)};
  animation: ${pulse} 1.3s ease-in-out infinite;
  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`
