/**
 * 카드 그리드 로딩 스켈레톤 — person-card의 썸네일(4:3) + 본문 라인 형태를 모사.
 * 텍스트 "불러오는 중…" 대신 실제 레이아웃을 미리 보여줘 체감 로딩을 매끄럽게.
 */
import styled, { keyframes } from 'styled-components'

import { EraCardGrid } from './person-card'

interface Props {
  /** 표시할 플레이스홀더 카드 수 */
  count?: number
}

export function CardGridSkeleton({ count = 8 }: Props) {
  return (
    <EraCardGrid aria-hidden role="presentation">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i}>
          <SkeletonThumb />
          <SkeletonBody>
            <SkeletonLine style={{ width: '70%', height: 13 }} />
            <SkeletonLine style={{ width: '45%' }} />
            <SkeletonLine style={{ width: '55%' }} />
            <SkeletonLine style={{ width: '100%', height: 5, marginTop: 4 }} />
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

const SkeletonCard = styled.div`
  border-radius: 12px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  border: 1px solid ${({ theme }) => theme.colors.border.light};
  background: ${({ theme }) =>
    theme.mode === 'dark'
      ? 'rgba(255,255,255,0.03)'
      : theme.colors.background.secondary};
`

const shimmerBg = (theme: { mode: string }) =>
  theme.mode === 'dark' ? 'rgba(255,255,255,0.08)' : '#e7eaef'

const SkeletonThumb = styled.div`
  width: 100%;
  aspect-ratio: 4 / 3;
  background: ${({ theme }) => shimmerBg(theme)};
  animation: ${pulse} 1.3s ease-in-out infinite;
  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`

const SkeletonBody = styled.div`
  padding: 10px 12px 12px;
  display: flex;
  flex-direction: column;
  gap: 7px;
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
