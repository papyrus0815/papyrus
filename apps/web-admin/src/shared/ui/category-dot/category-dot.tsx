/**
 * 공유 CategoryDot — 카테고리 색을 작은 원 형태로.
 * 4·6·8·10px 사이즈. 외부에서 색을 prop으로 직접 주거나, 카테고리 키로 조회.
 */
import React from 'react'

import styled from 'styled-components'

import { CATEGORY_BADGE_COLORS } from '@/pages/events/styles/theme'

interface Props {
  /** 카테고리 키 — 색을 자동 조회. color prop 우선. */
  category?: string
  /** 직접 지정한 색 — category보다 우선 */
  color?: string
  size?: 4 | 6 | 8 | 10
  className?: string
}

export const CategoryDot: React.FC<Props> = ({
  category,
  color,
  size = 8,
  className,
}) => {
  const resolved =
    color ??
    (category
      ? CATEGORY_BADGE_COLORS[category as keyof typeof CATEGORY_BADGE_COLORS]
      : undefined) ??
    '#94a3b8'
  return (
    <Dot
      $size={size}
      style={{ background: resolved }}
      aria-hidden="true"
      className={className}
    />
  )
}

const Dot = styled.span<{ $size: number }>`
  display: inline-block;
  flex-shrink: 0;
  width: ${({ $size }) => $size}px;
  height: ${({ $size }) => $size}px;
  border-radius: 50%;
`
