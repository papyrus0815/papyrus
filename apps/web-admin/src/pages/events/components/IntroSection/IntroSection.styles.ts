/**
 * IntroSection Styles
 */
import styled from 'styled-components'

import type { HistoricalEventCategory } from '../../create/events.types'
import {
  SkeletonText as BaseSkeletonText,
  pulseAnimation,
  shimmerAnimation,
} from '../../styles/shared.styles'
import { BREAKPOINTS, CATEGORY_COLORS } from '../../styles/theme'

export const Container = styled.section`
  display: flex;
  flex-direction: column;
  gap: 14px;
`

export const HighlightRow = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
  gap: 8px;
`

export const Highlight = styled.div`
  padding: 10px;
  border-radius: 10px;
  background: #f8fafc;
  border: 1px solid rgba(99, 102, 241, 0.08);
  display: flex;
  flex-direction: column;
  gap: 3px;

  strong {
    font-size: 15px;
    color: #111827;
  }

  span {
    font-size: 10px;
    color: #6b7280;
  }
`

export const CategoryGrid = styled.div`
  display: grid;
  gap: 8px;
  grid-template-columns: repeat(2, minmax(0, 1fr));

  @media (min-width: ${BREAKPOINTS.mobile}) {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  @media (min-width: ${BREAKPOINTS.desktop}) {
    grid-template-columns: repeat(5, minmax(0, 1fr));
  }
`

export const CategoryCard = styled.div`
  border-radius: 16px;
  padding: 14px 16px;
  display: flex;
  align-items: center;
  gap: 12px;
  background: #ffffff;
  border: 1px solid #e4e7ec;
  box-shadow: 0 4px 16px rgba(15, 17, 29, 0.06);
`

export const IconBubble = styled.span<{ $category: HistoricalEventCategory }>`
  width: 38px;
  height: 38px;
  border-radius: 12px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: ${({ $category }) =>
    CATEGORY_COLORS[$category]?.iconBackground || '#f1f5f9'};
  color: ${({ $category }) =>
    CATEGORY_COLORS[$category]?.iconColor || '#64748b'};
  font-size: 16px;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.6);
  flex-shrink: 0;
`

export const CategoryContent = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
`

export const CategoryTitle = styled.span`
  font-size: 12px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #475569;
  font-weight: 600;
`

export const CategoryCount = styled.strong`
  font-size: 20px;
  color: #0f172a;
`

export const CategoryTagline = styled.span`
  font-size: 11px;
  color: #64748b;
  line-height: 1.4;
`

// Skeleton Styles
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

export const SkeletonCategoryCard = styled.div`
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
`

export const SkeletonText = styled(BaseSkeletonText)``
