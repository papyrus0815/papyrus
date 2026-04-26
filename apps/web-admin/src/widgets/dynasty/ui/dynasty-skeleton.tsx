/**
 * 가문 행 스켈레톤 — 로딩 상태 placeholder.
 */
import styled, { keyframes } from 'styled-components'

interface Props {
  rows?: number
}

export function DynastySkeleton({ rows = 5 }: Props) {
  return (
    <Wrap aria-hidden role="presentation">
      {Array.from({ length: rows }, (_, i) => (
        <SkRow key={i} $delay={i * 0.06}>
          <SkTopLine>
            <SkBlock $w="44px" $h="44px" $radius="10px" />
            <SkPrimary>
              <SkBlock $w="35%" $h="14px" />
              <SkBlock $w="60%" $h="11px" />
            </SkPrimary>
            <SkBlock $w="20px" $h="20px" $radius="6px" />
          </SkTopLine>
          <SkTimelineRow>
            <SkBlock $w="100%" $h="4px" $radius="999px" />
          </SkTimelineRow>
        </SkRow>
      ))}
    </Wrap>
  )
}

const Wrap = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`

const shimmer = keyframes`
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
`

const fadeIn = keyframes`
  to { opacity: 1; }
`

const SkRow = styled.div<{ $delay: number }>`
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 14px 18px;
  background: ${({ theme }) => theme.colors.background.primary};
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  border-radius: 12px;
  opacity: 0;
  animation: ${fadeIn} 0.4s ease forwards;
  animation-delay: ${({ $delay }) => $delay}s;
`

const SkTopLine = styled.div`
  display: flex;
  align-items: center;
  gap: 14px;
`

const SkPrimary = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 0;
`

const SkTimelineRow = styled.div`
  padding-left: 58px;

  @media (max-width: 640px) {
    padding-left: 0;
  }
`

const SkBlock = styled.div<{ $w: string; $h: string; $radius?: string }>`
  width: ${({ $w }) => $w};
  height: ${({ $h }) => $h};
  border-radius: ${({ $radius }) => $radius ?? '6px'};
  background: linear-gradient(
    90deg,
    ${({ theme }) => theme.colors.background.tertiary} 0%,
    ${({ theme }) => theme.colors.background.quaternary} 50%,
    ${({ theme }) => theme.colors.background.tertiary} 100%
  );
  background-size: 200% 100%;
  animation: ${shimmer} 1.6s ease-in-out infinite;
`
