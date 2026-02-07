/**
 * Skeleton Loading Styled Components
 * 스켈레톤 로딩 관련 스타일
 */
import styled from 'styled-components'

import { pulseAnimation, shimmerAnimation } from './shared.styles'

// Skeleton 애니메이션 키프레임
const shimmer = `
  @keyframes shimmer {
    0% {
      background-position: -200% 0;
    }
    100% {
      background-position: 200% 0;
    }
  }
`

// List Skeleton
export const SkeletonListItem = styled.div<{ $depth: number }>`
  border: 1.5px solid rgba(20, 19, 34, 0.06);
  border-radius: 14px;
  padding: 0;
  margin-left: ${({ $depth }) => $depth * 24}px;
  min-height: ${({ $depth }) => Math.max(70, 90 - $depth * 10)}px;
  background: #ffffff;
  display: flex;
  gap: 0;
  opacity: 0.6;
  ${pulseAnimation}
  overflow: hidden;
  height: ${({ $depth }) => Math.max(70, 90 - $depth * 10)}px;
`

export const SkeletonThumbnail = styled.div<{ $depth: number }>`
  width: ${({ $depth }) => Math.max(60, 90 - $depth * 10)}px;
  align-self: stretch;
  flex-shrink: 0;
  background: linear-gradient(
    90deg,
    rgba(99, 102, 241, 0.15) 0%,
    rgba(99, 102, 241, 0.25) 50%,
    rgba(99, 102, 241, 0.15) 100%
  );
  ${shimmerAnimation}
  border-radius: 12px 0 0 12px;
  ${shimmer}
`

export const SkeletonHeader = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 8px;
`

export const SkeletonExpandButton = styled.div`
  width: 20px;
  height: 20px;
  background: linear-gradient(
    90deg,
    rgba(99, 102, 241, 0.1) 0%,
    rgba(99, 102, 241, 0.2) 50%,
    rgba(99, 102, 241, 0.1) 100%
  );
  ${shimmerAnimation}
  border-radius: 6px;
  flex-shrink: 0;
  margin-top: 1px;
  ${shimmer}
`

export const SkeletonDot = styled.div`
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: linear-gradient(
    90deg,
    rgba(99, 102, 241, 0.15) 0%,
    rgba(99, 102, 241, 0.25) 50%,
    rgba(99, 102, 241, 0.15) 100%
  );
  ${shimmerAnimation}
  flex-shrink: 0;
  margin-top: 4px;
  ${shimmer}
`

export const SkeletonTitle = styled.div`
  height: 14px;
  flex: 1;
  background: linear-gradient(
    90deg,
    rgba(99, 102, 241, 0.1) 0%,
    rgba(99, 102, 241, 0.15) 50%,
    rgba(99, 102, 241, 0.1) 100%
  );
  ${shimmerAnimation}
  border-radius: 6px;
  margin-top: 3px;
  ${shimmer}
`

export const SkeletonMeta = styled.div`
  height: 10px;
  width: 60%;
  background: linear-gradient(
    90deg,
    rgba(99, 102, 241, 0.08) 0%,
    rgba(99, 102, 241, 0.12) 50%,
    rgba(99, 102, 241, 0.08) 100%
  );
  ${shimmerAnimation}
  border-radius: 5px;
  margin-left: 28px;
  margin-top: 4px;
  ${shimmer}
`

export const SkeletonSummary = styled.div`
  height: 10px;
  width: 80%;
  background: linear-gradient(
    90deg,
    rgba(99, 102, 241, 0.08) 0%,
    rgba(99, 102, 241, 0.12) 50%,
    rgba(99, 102, 241, 0.08) 100%
  );
  ${shimmerAnimation}
  border-radius: 5px;
  margin-left: 28px;
  margin-top: 4px;
  ${shimmer}
`

// Detail Panel Skeleton
export const DetailPanelSkeleton = styled.div`
  display: flex;
  flex-direction: column;
  gap: 20px;
  padding: 24px;
`

export const SkeletonDetailHeroImage = styled.div`
  width: 100%;
  max-width: 400px;
  height: 220px;
  background: linear-gradient(
    90deg,
    rgba(99, 102, 241, 0.15) 0%,
    rgba(99, 102, 241, 0.25) 50%,
    rgba(99, 102, 241, 0.15) 100%
  );
  ${shimmerAnimation}
  border-radius: 12px;
  margin: 20px auto;
  ${shimmer}
`

export const SkeletonDetailTitle = styled.div`
  width: 85%;
  height: 24px;
  background: linear-gradient(
    90deg,
    rgba(99, 102, 241, 0.12) 0%,
    rgba(99, 102, 241, 0.18) 50%,
    rgba(99, 102, 241, 0.12) 100%
  );
  ${shimmerAnimation}
  border-radius: 8px;
  ${shimmer}
`

export const SkeletonText = styled.div<{ $width?: string }>`
  width: ${({ $width }) => $width ?? '100%'};
  height: 12px;
  background: linear-gradient(
    90deg,
    rgba(99, 102, 241, 0.08) 0%,
    rgba(99, 102, 241, 0.12) 50%,
    rgba(99, 102, 241, 0.08) 100%
  );
  ${shimmerAnimation}
  border-radius: 6px;
  ${shimmer}
`

export const SkeletonCard = styled.div`
  border: 1px solid rgba(20, 19, 34, 0.08);
  border-radius: 12px;
  padding: 12px;
  background: linear-gradient(180deg, #fafbff, #ffffff);
  height: 60px;
  display: flex;
  gap: 8px;
  align-items: center;

  &::before {
    content: '';
    width: 16px;
    height: 16px;
    background: linear-gradient(
      90deg,
      rgba(99, 102, 241, 0.1) 0%,
      rgba(99, 102, 241, 0.15) 50%,
      rgba(99, 102, 241, 0.1) 100%
    );
    ${shimmerAnimation}
    border-radius: 4px;
    ${shimmer}
  }

  &::after {
    content: '';
    flex: 1;
    height: 12px;
    background: linear-gradient(
      90deg,
      rgba(99, 102, 241, 0.08) 0%,
      rgba(99, 102, 241, 0.12) 50%,
      rgba(99, 102, 241, 0.08) 100%
    );
    ${shimmerAnimation}
    border-radius: 6px;
    ${shimmer}
  }
`

// Century Skeleton
export const SkeletonCenturyButton = styled.div`
  border: 1.5px solid rgba(99, 102, 241, 0.08);
  border-radius: 10px;
  padding: 10px 12px;
  background: #ffffff;
  display: flex;
  flex-direction: column;
  gap: 6px;
  ${pulseAnimation}

  @media (max-width: 768px) {
    flex-shrink: 0;
    min-width: 140px;
  }
`

export const SkeletonCenturyLabel = styled.div`
  height: 32px;
  width: 100%;
  background: linear-gradient(
    90deg,
    rgba(99, 102, 241, 0.1) 0%,
    rgba(99, 102, 241, 0.15) 50%,
    rgba(99, 102, 241, 0.1) 100%
  );
  ${shimmerAnimation}
  border-radius: 6px;
  ${shimmer}
`

export const SkeletonCenturyCount = styled.div`
  height: 18px;
  width: 50px;
  background: linear-gradient(
    90deg,
    rgba(99, 102, 241, 0.08) 0%,
    rgba(99, 102, 241, 0.12) 50%,
    rgba(99, 102, 241, 0.08) 100%
  );
  ${shimmerAnimation}
  border-radius: 6px;
  ${shimmer}
`

// Category Summary Skeleton
export const SkeletonCategorySummaryCard = styled.div`
  border-radius: 20px;
  padding: 16px 18px;
  display: flex;
  align-items: center;
  gap: 14px;
  background: #ffffff;
  border: 1px solid #e4e7ec;
  box-shadow: 0 6px 20px rgba(15, 17, 29, 0.06);
  ${pulseAnimation}
`

export const SkeletonIconBubble = styled.div`
  width: 42px;
  height: 42px;
  border-radius: 14px;
  background: linear-gradient(
    90deg,
    rgba(99, 102, 241, 0.12) 0%,
    rgba(99, 102, 241, 0.18) 50%,
    rgba(99, 102, 241, 0.12) 100%
  );
  ${shimmerAnimation}
  flex-shrink: 0;
  ${shimmer}
`

export const SkeletonHighlight = styled.div`
  padding: 10px;
  border-radius: 10px;
  background: #f8fafc;
  border: 1px solid rgba(99, 102, 241, 0.08);
  display: flex;
  flex-direction: column;
  gap: 6px;
  ${pulseAnimation}
`

// Category Summary Cards (Real Components)
export const CategorySummaryGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
  margin-bottom: 20px;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
    gap: 12px;
  }
`

export const CategorySummaryCard = styled.div<{ $category: string }>`
  border-radius: 20px;
  padding: 18px 20px;
  display: flex;
  align-items: center;
  gap: 16px;
  background: #ffffff;
  border: 1px solid
    ${(props) => {
      const colors = {
        military: 'rgba(239, 68, 68, 0.2)',
        political: 'rgba(99, 102, 241, 0.2)',
        economic: 'rgba(245, 158, 11, 0.25)',
        social: 'rgba(6, 182, 212, 0.22)',
        technological: 'rgba(14, 165, 233, 0.22)',
        cultural: 'rgba(236, 72, 153, 0.22)',
        diplomatic: 'rgba(139, 92, 246, 0.22)',
        conference: 'rgba(99, 102, 241, 0.2)',
        religious: 'rgba(251, 146, 60, 0.22)',
        other: 'rgba(107, 114, 128, 0.22)',
      }
      return (
        colors[props.$category as keyof typeof colors] ||
        'rgba(99, 102, 241, 0.2)'
      )
    }};
  box-shadow: ${(props) => {
    const shadows = {
      military: '0 8px 24px rgba(239, 68, 68, 0.12)',
      political: '0 8px 24px rgba(99, 102, 241, 0.12)',
      economic: '0 8px 24px rgba(245, 158, 11, 0.12)',
      social: '0 8px 24px rgba(6, 182, 212, 0.12)',
      technological: '0 8px 24px rgba(14, 165, 233, 0.12)',
      cultural: '0 8px 24px rgba(236, 72, 153, 0.12)',
      diplomatic: '0 8px 24px rgba(139, 92, 246, 0.12)',
      conference: '0 8px 24px rgba(99, 102, 241, 0.12)',
      religious: '0 8px 24px rgba(251, 146, 60, 0.12)',
      other: '0 8px 24px rgba(107, 114, 128, 0.12)',
    }
    return (
      shadows[props.$category as keyof typeof shadows] ||
      '0 8px 24px rgba(99, 102, 241, 0.12)'
    )
  }};
  transition: all 0.3s ease;
  cursor: pointer;

  &:hover {
    transform: translateY(-3px);
    box-shadow: ${(props) => {
      const shadows = {
        military: '0 12px 32px rgba(239, 68, 68, 0.18)',
        political: '0 12px 32px rgba(99, 102, 241, 0.18)',
        economic: '0 12px 32px rgba(245, 158, 11, 0.18)',
        social: '0 12px 32px rgba(6, 182, 212, 0.18)',
        technological: '0 12px 32px rgba(14, 165, 233, 0.18)',
        cultural: '0 12px 32px rgba(236, 72, 153, 0.18)',
        diplomatic: '0 12px 32px rgba(139, 92, 246, 0.18)',
        conference: '0 12px 32px rgba(99, 102, 241, 0.18)',
        religious: '0 12px 32px rgba(251, 146, 60, 0.18)',
        other: '0 12px 32px rgba(107, 114, 128, 0.18)',
      }
      return (
        shadows[props.$category as keyof typeof shadows] ||
        '0 12px 32px rgba(99, 102, 241, 0.18)'
      )
    }};
  }

  @media (max-width: 768px) {
    padding: 14px 16px;
    gap: 12px;
  }
`

export const CategoryIconBubble = styled.div<{ $category: string }>`
  width: 48px;
  height: 48px;
  border-radius: 16px;
  background: ${(props) => {
    const backgrounds = {
      military: 'rgba(239, 68, 68, 0.15)',
      political: 'rgba(99, 102, 241, 0.15)',
      economic: 'rgba(245, 158, 11, 0.18)',
      social: 'rgba(6, 182, 212, 0.15)',
      technological: 'rgba(14, 165, 233, 0.15)',
      cultural: 'rgba(236, 72, 153, 0.15)',
      diplomatic: 'rgba(139, 92, 246, 0.15)',
      conference: 'rgba(99, 102, 241, 0.15)',
      religious: 'rgba(251, 146, 60, 0.15)',
      other: 'rgba(107, 114, 128, 0.15)',
    }
    return (
      backgrounds[props.$category as keyof typeof backgrounds] ||
      'rgba(99, 102, 241, 0.15)'
    )
  }};
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;

  svg {
    width: 22px;
    height: 22px;
    color: ${(props) => {
      const colors = {
        military: '#dc2626',
        political: '#4f46e5',
        economic: '#d97706',
        social: '#0891b2',
        technological: '#0284c7',
        cultural: '#db2777',
        diplomatic: '#7c3aed',
        conference: '#4338ca',
        religious: '#ea580c',
        other: '#4b5563',
      }
      return colors[props.$category as keyof typeof colors] || '#4f46e5'
    }};
  }

  @media (max-width: 768px) {
    width: 42px;
    height: 42px;

    svg {
      width: 20px;
      height: 20px;
    }
  }
`

export const CategorySummaryContent = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
  flex: 1;
`

export const CategorySummaryTitle = styled.h3`
  margin: 0;
  font-size: 16px;
  font-weight: 700;
  color: #0f172a;
  letter-spacing: -0.01em;

  @media (max-width: 768px) {
    font-size: 15px;
  }
`

export const CategorySummaryCount = styled.div`
  font-size: 13px;
  font-weight: 600;
  color: #6366f1;

  @media (max-width: 768px) {
    font-size: 12px;
  }
`

export const CategorySummaryTagline = styled.p<{ $category: string }>`
  margin: 0;
  font-size: 11px;
  color: #64748b;
  line-height: 1.4;

  @media (max-width: 768px) {
    font-size: 10px;
  }
`
