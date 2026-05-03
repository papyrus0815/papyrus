/**
 * 공유 ImportancePill — 사건의 중요도(critical/major/notable) 시각 뱃지.
 *
 * - critical → "핵심" (indigo)
 * - major    → "주요" (amber)
 * - notable  → 표시 안 함 (null 반환)
 *
 * size:
 *   - 'sm'  : 9.5px (트리·그리드 등 컴팩트)
 *   - 'md'  : 10.5px (목록 row 기본)
 *
 * tone:
 *   - 'soft'    : 평소 — 약한 배경 + 컬러 텍스트 (기본)
 *   - 'overlay' : 어두운 오버레이 위 — 더 진한 배경 (Gallery 카드 등)
 */
import React from 'react'

import styled, { css } from 'styled-components'

export type ImportanceTier = 'critical' | 'major' | 'notable' | 'normal'

interface Props {
  tier: ImportanceTier
  size?: 'sm' | 'md'
  tone?: 'soft' | 'overlay'
  className?: string
}

export const ImportancePill: React.FC<Props> = ({
  tier,
  size = 'md',
  tone = 'soft',
  className,
}) => {
  if (tier !== 'critical' && tier !== 'major') return null
  const label = tier === 'critical' ? '핵심' : '주요'
  return (
    <Pill
      $tier={tier}
      $size={size}
      $tone={tone}
      role="img"
      aria-label={`${label} 사건`}
      className={className}
    >
      {label}
    </Pill>
  )
}

const Pill = styled.span<{
  $tier: 'critical' | 'major'
  $size: 'sm' | 'md'
  $tone: 'soft' | 'overlay'
}>`
  display: inline-flex;
  align-items: center;
  flex-shrink: 0;
  padding: ${({ $size }) => ($size === 'sm' ? '1px 5px' : '2px 8px')};
  border-radius: ${({ $size }) => ($size === 'sm' ? '4px' : '999px')};
  font-size: ${({ $size }) => ($size === 'sm' ? '9.5px' : '10.5px')};
  font-weight: 700;
  letter-spacing: 0.02em;
  text-transform: uppercase;

  ${({ $tier, $tone, theme }) => {
    if ($tone === 'overlay') {
      return $tier === 'critical'
        ? css`
            background: rgba(37, 99, 235, 0.65);
            color: #f1f5ff;
          `
        : css`
            background: rgba(245, 158, 11, 0.55);
            color: #fff7e0;
          `
    }
    return $tier === 'critical'
      ? css`
          background: ${theme.mode === 'dark'
            ? 'rgba(37, 99, 235, 0.28)'
            : 'rgba(37, 99, 235, 0.16)'};
          color: ${theme.mode === 'dark' ? '#c7d2fe' : '#1e40af'};
        `
      : css`
          background: ${theme.mode === 'dark'
            ? 'rgba(245, 158, 11, 0.22)'
            : 'rgba(245, 158, 11, 0.16)'};
          color: ${theme.mode === 'dark' ? '#fcd34d' : '#b45309'};
        `
  }}
`
