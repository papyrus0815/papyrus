/**
 * 카드 그리드 로딩 스켈레톤 — person-card와 **같은 틀**(카드 폭 전체 4:5 초상 + 본문 두 줄).
 *
 * 카드와 치수가 같아야 로딩→완료 전환에서 격자가 튀지 않는다. 그래서 틀은 카드의 격자
 * (EraCardGrid)·radius·본문 padding을 그대로 쓰고, 채움만 shimmer로 둔다.
 * shimmer는 격자 전체가 한 번에 쓸리도록 background-attachment: fixed로 위상을 맞춘다.
 */
import styled, { css, keyframes } from 'styled-components'

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
          <SkeletonVisual>
            <CaptionBars>
              <Bar $onImage style={{ width: 34, height: 16 }} />
              <Bar $onImage style={{ width: '72%', height: 18 }} />
              <Bar $onImage style={{ width: '48%', height: 11 }} />
            </CaptionBars>
          </SkeletonVisual>
          <SkeletonBody>
            <SkeletonRow>
              <Bar style={{ width: '52%', height: 13 }} />
              <Bar style={{ width: 52, height: 11 }} />
            </SkeletonRow>
            <SkeletonRow>
              <Bar style={{ width: '64%', height: 12 }} />
              <Bar style={{ width: 34, height: 12 }} />
            </SkeletonRow>
          </SkeletonBody>
        </SkeletonCard>
      ))}
    </EraCardGrid>
  )
}

const sweep = keyframes`
  from { background-position: -600px 0; }
  to { background-position: 600px 0; }
`

const shimmer = css`
  background-color: ${({ theme }) => (theme.mode === 'dark' ? '#1f2227' : '#eceff3')};
  background-image: linear-gradient(
    90deg,
    transparent 0,
    ${({ theme }) =>
        theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.06)' : 'rgba(255, 255, 255, 0.75)'}
      50%,
    transparent 100%
  );
  background-size: 600px 100%;
  background-repeat: no-repeat;
  background-attachment: fixed;
  animation: ${sweep} 1.4s ease-in-out infinite;

  @media (prefers-reduced-motion: reduce) {
    animation: none;
    background-image: none;
  }
`

const SkeletonCard = styled.div`
  display: flex;
  flex-direction: column;
  border-radius: 14px;
  overflow: hidden;
  border: 1px solid ${hairline};
  background: ${surface};
`

const SkeletonVisual = styled.div`
  position: relative;
  aspect-ratio: 4 / 5;
  ${shimmer}
`

/** 초상 하단 캡션 자리(분야·이름·직함) — 실제 카드처럼 이미지 안쪽 아래에 */
const CaptionBars = styled.div`
  position: absolute;
  left: 14px;
  right: 14px;
  bottom: 13px;
  display: flex;
  flex-direction: column;
  gap: 7px;
`

const SkeletonBody = styled.div`
  display: flex;
  flex-direction: column;
  gap: 9px;
  padding: 13px 14px 14px;
`

const SkeletonRow = styled.div`
  display: flex;
  justify-content: space-between;
  gap: 12px;
`

const Bar = styled.div<{ $onImage?: boolean }>`
  border-radius: 5px;
  ${({ $onImage, theme }) =>
    $onImage
      ? css`
          background: ${theme.mode === 'dark' ? 'rgba(255,255,255,0.07)' : 'rgba(255,255,255,0.7)'};
        `
      : shimmer}
`
