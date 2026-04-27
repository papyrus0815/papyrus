/**
 * Badge — 카운트/상태 표시용 작은 알약 컴포넌트.
 * tone으로 색상, size로 크기를 변형.
 */
import React from 'react'
import styled, { css } from 'styled-components'

export type BadgeTone = 'primary' | 'danger' | 'neutral'
export type BadgeSize = 'sm' | 'md'

export interface BadgeProps {
  tone?: BadgeTone
  size?: BadgeSize
  children: React.ReactNode
  className?: string
}

export const Badge: React.FC<BadgeProps> = ({
  tone = 'primary',
  size = 'sm',
  children,
  className,
}) => (
  <BadgeRoot $tone={tone} $size={size} className={className}>
    {children}
  </BadgeRoot>
)

const BadgeRoot = styled.span<{ $tone: BadgeTone; $size: BadgeSize }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.01em;
  flex-shrink: 0;
  line-height: 1;

  ${({ $size }) =>
    $size === 'md'
      ? css`
          min-width: 22px;
          height: 22px;
          padding: 0 8px;
          font-size: 11.5px;
        `
      : css`
          min-width: 18px;
          height: 18px;
          padding: 0 6px;
          font-size: 10.5px;
        `}

  ${({ theme, $tone }) => {
    if ($tone === 'danger') {
      return css`
        background: ${theme.mode === 'dark'
          ? 'rgba(239, 68, 68, 0.22)'
          : 'rgba(239, 68, 68, 0.14)'};
        color: ${theme.mode === 'dark' ? '#fca5a5' : '#ef4444'};
      `
    }
    if ($tone === 'neutral') {
      return css`
        background: ${theme.mode === 'dark'
          ? 'rgba(255, 255, 255, 0.08)'
          : 'rgba(15, 23, 42, 0.08)'};
        color: ${theme.colors.text.secondary};
      `
    }
    // primary
    return css`
      background: ${theme.mode === 'dark'
        ? 'rgba(99, 102, 241, 0.32)'
        : 'rgba(99, 102, 241, 0.18)'};
      color: ${theme.mode === 'dark' ? '#c7d2fe' : '#4338ca'};
    `
  }}
`
