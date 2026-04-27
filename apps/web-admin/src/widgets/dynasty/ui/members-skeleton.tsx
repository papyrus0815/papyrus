/**
 * 가문 구성원 모달 — 로딩 스켈레톤.
 * Timeline / Grid 둘 다 비슷한 톤의 placeholder.
 */
import styled, { keyframes } from 'styled-components'

interface Props {
  view: 'timeline' | 'grid'
}

export function MembersSkeleton({ view }: Props) {
  if (view === 'timeline') {
    return (
      <SkTimeline aria-hidden role="presentation">
        {Array.from({ length: 8 }, (_, i) => (
          <SkRow key={i} $delay={i * 0.05}>
            <SkBlock $w="120px" $h="12px" />
            <SkBarBg>
              <SkBlock
                $w={`${30 + ((i * 17) % 50)}%`}
                $h="14px"
                $radius="4px"
                style={{ marginLeft: `${(i * 11) % 30}%` }}
              />
            </SkBarBg>
          </SkRow>
        ))}
      </SkTimeline>
    )
  }
  return (
    <SkGrid aria-hidden role="presentation">
      {Array.from({ length: 12 }, (_, i) => (
        <SkCard key={i} $delay={i * 0.04}>
          <SkBlock $w="60%" $h="10px" />
          <SkBlock $w="64px" $h="64px" $radius="50%" />
          <SkBlock $w="70%" $h="13px" />
          <SkBlock $w="50%" $h="10px" />
        </SkCard>
      ))}
    </SkGrid>
  )
}

const shimmer = keyframes`
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
`

const fadeIn = keyframes`
  to { opacity: 1; }
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

const SkTimeline = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 4px;
`

const SkRow = styled.div<{ $delay: number }>`
  display: grid;
  grid-template-columns: 160px 1fr;
  gap: 12px;
  align-items: center;
  height: 30px;
  opacity: 0;
  animation: ${fadeIn} 0.4s ease forwards;
  animation-delay: ${({ $delay }) => $delay}s;
`

const SkBarBg = styled.div`
  position: relative;
  height: 100%;
  display: flex;
  align-items: center;
`

const SkGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(100%, 160px), 1fr));
  gap: 14px;
`

const SkCard = styled.div<{ $delay: number }>`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 14px 12px 16px;
  border-radius: 14px;
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  opacity: 0;
  animation: ${fadeIn} 0.4s ease forwards;
  animation-delay: ${({ $delay }) => $delay}s;
`
