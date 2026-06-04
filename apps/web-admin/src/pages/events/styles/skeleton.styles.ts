/**
 * Skeleton Loading Styled Components
 *
 * shimmer/pulse 키프레임은 `theme.ts`의 `KEYFRAMES`에 1회 정의되며 `shared.styles`의
 * `shimmerAnimation`/`pulseAnimation` mixin을 통해 주입된다. 컴포넌트마다 keyframes
 * 인라인 재선언하던 12곳은 정리됨.
 *
 * `prefers-reduced-motion`은 mixin 안에서 `animation: none`으로 분기 — 운동 민감
 * 사용자에게는 정적 표면색만 표시된다.
 */
import styled from 'styled-components'

import { pulseAnimation, shimmerAnimation } from './shared.styles'

/** 카드 표면 위에 얹는 shimmering bar — height/width를 prop으로 받도록 base 통일 */
const skeletonBar = `
  background: linear-gradient(
    90deg,
    rgba(37, 99, 235, 0.1) 0%,
    rgba(37, 99, 235, 0.15) 50%,
    rgba(37, 99, 235, 0.1) 100%
  );
`
const skeletonBarStrong = `
  background: linear-gradient(
    90deg,
    rgba(37, 99, 235, 0.15) 0%,
    rgba(37, 99, 235, 0.25) 50%,
    rgba(37, 99, 235, 0.15) 100%
  );
`
const skeletonBarSubtle = `
  background: linear-gradient(
    90deg,
    rgba(37, 99, 235, 0.08) 0%,
    rgba(37, 99, 235, 0.12) 50%,
    rgba(37, 99, 235, 0.08) 100%
  );
`

// ─── List Skeleton ────────────────────────────────────────────────
export const SkeletonListItem = styled.div<{ $depth: number }>`
  border: 1.5px solid
    ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(255, 255, 255, 0.07)'
        : 'rgba(20, 19, 34, 0.06)'};
  border-radius: 14px;
  padding: 0;
  margin-left: ${({ $depth }) => $depth * 24}px;
  min-height: ${({ $depth }) => Math.max(70, 90 - $depth * 10)}px;
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.04)' : '#ffffff'};
  display: flex;
  gap: 0;
  /* 컨테이너 pulse 제거 — 자식 bar의 shimmer만으로 로딩 신호. 두 애니메이션이
     동시에 돌며 생기던 미세 '떨림' 해소(자식 shimmer가 단일 신호 담당). */
  overflow: hidden;
  height: ${({ $depth }) => Math.max(70, 90 - $depth * 10)}px;
`

export const SkeletonThumbnail = styled.div<{ $depth: number }>`
  width: ${({ $depth }) => Math.max(60, 90 - $depth * 10)}px;
  align-self: stretch;
  flex-shrink: 0;
  ${skeletonBarStrong}
  ${shimmerAnimation}
  border-radius: 12px 0 0 12px;
`

export const SkeletonHeader = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 8px;
`

export const SkeletonExpandButton = styled.div`
  width: 20px;
  height: 20px;
  ${skeletonBar}
  ${shimmerAnimation}
  border-radius: 6px;
  flex-shrink: 0;
  margin-top: 1px;
`

export const SkeletonDot = styled.div`
  width: 10px;
  height: 10px;
  border-radius: 50%;
  ${skeletonBarStrong}
  ${shimmerAnimation}
  flex-shrink: 0;
  margin-top: 4px;
`

export const SkeletonTitle = styled.div`
  height: 14px;
  flex: 1;
  ${skeletonBar}
  ${shimmerAnimation}
  border-radius: 6px;
  margin-top: 3px;
`

export const SkeletonMeta = styled.div`
  height: 10px;
  width: 60%;
  ${skeletonBarSubtle}
  ${shimmerAnimation}
  border-radius: 5px;
  margin-left: 28px;
  margin-top: 4px;
`

export const SkeletonSummary = styled.div`
  height: 10px;
  width: 80%;
  ${skeletonBarSubtle}
  ${shimmerAnimation}
  border-radius: 5px;
  margin-left: 28px;
  margin-top: 4px;
`

// ─── Detail Panel Skeleton ────────────────────────────────────────
export const DetailPanelSkeleton = styled.div`
  display: flex;
  flex-direction: column;
  gap: 20px;
  padding: 24px;
`

/* HeroFigure(200px)와 height 일치 — skeleton→실제 전환 시 CLS 0 */
export const SkeletonDetailHeroImage = styled.div`
  height: 200px;
  margin: 12px 16px 0;
  ${skeletonBarStrong}
  ${shimmerAnimation}
  border-radius: 10px;
`

export const SkeletonDetailTitle = styled.div`
  width: 85%;
  height: 24px;
  background: linear-gradient(
    90deg,
    rgba(37, 99, 235, 0.12) 0%,
    rgba(37, 99, 235, 0.18) 50%,
    rgba(37, 99, 235, 0.12) 100%
  );
  ${shimmerAnimation}
  border-radius: 8px;
`

export const SkeletonText = styled.div<{ $width?: string }>`
  width: ${({ $width }) => $width ?? '100%'};
  height: 12px;
  ${skeletonBarSubtle}
  ${shimmerAnimation}
  border-radius: 6px;
`

export const SkeletonCard = styled.div`
  border: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(255, 255, 255, 0.07)'
        : 'rgba(20, 19, 34, 0.08)'};
  border-radius: 12px;
  padding: 12px;
  background: ${({ theme }) =>
    theme.mode === 'dark'
      ? 'rgba(255, 255, 255, 0.03)'
      : '#ffffff'};
  height: 60px;
  display: flex;
  gap: 8px;
  align-items: center;

  &::before {
    content: '';
    width: 16px;
    height: 16px;
    ${skeletonBar}
    ${shimmerAnimation}
    border-radius: 4px;
  }

  &::after {
    content: '';
    flex: 1;
    height: 12px;
    ${skeletonBarSubtle}
    ${shimmerAnimation}
    border-radius: 6px;
  }
`

// ─── Century Skeleton ─────────────────────────────────────────────
export const SkeletonCenturyButton = styled.div`
  border: 1.5px solid
    ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(37, 99, 235, 0.18)'
        : 'rgba(37, 99, 235, 0.08)'};
  border-radius: 10px;
  padding: 10px 12px;
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.03)' : '#ffffff'};
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
  ${skeletonBar}
  ${shimmerAnimation}
  border-radius: 6px;
`

export const SkeletonCenturyCount = styled.div`
  height: 18px;
  width: 50px;
  ${skeletonBarSubtle}
  ${shimmerAnimation}
  border-radius: 6px;
`

// ─── Category Summary Skeleton ────────────────────────────────────
export const SkeletonCategorySummaryCard = styled.div`
  border-radius: 20px;
  padding: 16px 18px;
  display: flex;
  align-items: center;
  gap: 14px;
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.04)' : '#ffffff'};
  border: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.08)' : '#e4e7ec'};
  ${pulseAnimation}
`

export const SkeletonIconBubble = styled.div`
  width: 42px;
  height: 42px;
  border-radius: 14px;
  background: linear-gradient(
    90deg,
    rgba(37, 99, 235, 0.12) 0%,
    rgba(37, 99, 235, 0.18) 50%,
    rgba(37, 99, 235, 0.12) 100%
  );
  ${shimmerAnimation}
  flex-shrink: 0;
`

export const SkeletonHighlight = styled.div`
  padding: 10px;
  border-radius: 10px;
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.03)' : '#f8fafc'};
  border: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(37, 99, 235, 0.18)'
        : 'rgba(37, 99, 235, 0.08)'};
  display: flex;
  flex-direction: column;
  gap: 6px;
  ${pulseAnimation}
`

// ─── Category Summary Cards (Real Components) ─────────────────────
// 카테고리별 색은 의도적으로 톤 다양성 유지 (정보 색채). hover lift는 평면 톤 정책 위반이라
// 제거 — 뱃지/색은 카테고리 변별을 돕고, 인터랙션은 boder-color shift로만.
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

const CATEGORY_BORDERS: Record<string, string> = {
  military: 'rgba(239, 68, 68, 0.2)',
  political: 'rgba(37, 99, 235, 0.2)',
  economic: 'rgba(245, 158, 11, 0.25)',
  social: 'rgba(6, 182, 212, 0.22)',
  technological: 'rgba(14, 165, 233, 0.22)',
  cultural: 'rgba(236, 72, 153, 0.22)',
  diplomatic: 'rgba(37, 99, 235, 0.22)',
  conference: 'rgba(37, 99, 235, 0.2)',
  religious: 'rgba(251, 146, 60, 0.22)',
  other: 'rgba(107, 114, 128, 0.22)',
}

export const CategorySummaryCard = styled.div<{ $category: string }>`
  border-radius: 14px;
  padding: 18px 20px;
  display: flex;
  align-items: center;
  gap: 16px;
  background: #ffffff;
  border: 1px solid
    ${({ $category }) => CATEGORY_BORDERS[$category] ?? CATEGORY_BORDERS.other};
  cursor: pointer;
  transition: border-color 0.15s ease, background 0.15s ease;

  &:hover {
    border-color: rgba(37, 99, 235, 0.45);
    background: #fafbfd;
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }

  @media (max-width: 768px) {
    padding: 14px 16px;
    gap: 12px;
  }
`

const CATEGORY_BUBBLE_BG: Record<string, string> = {
  military: 'rgba(239, 68, 68, 0.15)',
  political: 'rgba(37, 99, 235, 0.15)',
  economic: 'rgba(245, 158, 11, 0.18)',
  social: 'rgba(6, 182, 212, 0.15)',
  technological: 'rgba(14, 165, 233, 0.15)',
  cultural: 'rgba(236, 72, 153, 0.15)',
  diplomatic: 'rgba(37, 99, 235, 0.15)',
  conference: 'rgba(37, 99, 235, 0.15)',
  religious: 'rgba(251, 146, 60, 0.15)',
  other: 'rgba(107, 114, 128, 0.15)',
}
const CATEGORY_BUBBLE_COLOR: Record<string, string> = {
  military: '#dc2626',
  political: '#1d4ed8',
  economic: '#d97706',
  social: '#0891b2',
  technological: '#0284c7',
  cultural: '#db2777',
  diplomatic: '#7c3aed',
  conference: '#1e40af',
  religious: '#ea580c',
  other: '#4b5563',
}

export const CategoryIconBubble = styled.div<{ $category: string }>`
  width: 48px;
  height: 48px;
  border-radius: 12px;
  background: ${({ $category }) =>
    CATEGORY_BUBBLE_BG[$category] ?? CATEGORY_BUBBLE_BG.other};
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;

  svg {
    width: 22px;
    height: 22px;
    color: ${({ $category }) =>
      CATEGORY_BUBBLE_COLOR[$category] ?? CATEGORY_BUBBLE_COLOR.other};
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
  font-size: 15px;
  font-weight: 700;
  color: #0f172a;
  letter-spacing: -0.01em;

  @media (max-width: 768px) {
    font-size: 14px;
  }
`

export const CategorySummaryCount = styled.div`
  font-size: 13px;
  font-weight: 600;
  color: #2563eb;

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
