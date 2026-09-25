/**
 * 카드 그리드 로딩 스켈레톤 — person-card의 [초상 + 분야·이름·직함·생몰] 머리와 사실 줄·영향력 형태를 모사.
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
          <SkeletonHead>
            <SkeletonPortrait />
            <SkeletonLines>
              <SkeletonLine style={{ width: '30%' }} />
              <SkeletonLine style={{ width: '75%', height: 18 }} />
              <SkeletonLine style={{ width: '55%' }} />
              <SkeletonLine style={{ width: '45%', height: 14, marginTop: 'auto' }} />
            </SkeletonLines>
          </SkeletonHead>
          <SkeletonLine style={{ width: '100%', marginTop: 14 }} />
          <SkeletonLine style={{ width: '100%', height: 6 }} />
        </SkeletonCard>
      ))}
    </EraCardGrid>
  )
}

const pulse = keyframes`
  0%, 100% { opacity: 0.55; }
  50% { opacity: 1; }
`

const SkeletonCard = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 18px 16px 16px 20px;
  border-radius: 14px;
  border: 1px solid ${hairline};
  background: ${surface};
`

const shimmerBg = (theme: { mode: string }) =>
  theme.mode === 'dark' ? 'rgba(255,255,255,0.08)' : '#eceff3'

const SkeletonHead = styled.div`
  display: flex;
  gap: 16px;
`

const SkeletonPortrait = styled.div`
  width: 96px;
  height: 120px;
  flex-shrink: 0;
  border-radius: 10px;
  background: ${({ theme }) => shimmerBg(theme)};
  animation: ${pulse} 1.3s ease-in-out infinite;
  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`

const SkeletonLines = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
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
