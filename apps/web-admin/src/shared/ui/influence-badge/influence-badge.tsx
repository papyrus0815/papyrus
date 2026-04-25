import styled from 'styled-components'

import {
  getInfluenceTier,
  type InfluenceTier,
} from '@/shared/lib/influence-tier'

interface InfluenceBadgeProps {
  influence: number | null | undefined
  /** 'overlay' = 카드 썸네일 위 절대 위치, 'inline' = 텍스트 옆 */
  variant?: 'overlay' | 'inline'
  className?: string
}

/**
 * 영향력(0-100) → ★+숫자 뱃지. 티어별 색상으로 표시.
 * null·0은 렌더하지 않음(tier가 null이면 시각 노이즈를 줄이기 위해 숨김).
 */
export function InfluenceBadge({
  influence,
  variant = 'inline',
  className,
}: InfluenceBadgeProps) {
  const tier = getInfluenceTier(influence)
  if (!tier) return null
  return (
    <Badge
      $tier={tier}
      $variant={variant}
      aria-label={`영향력 ${influence}`}
      title={`영향력 ${influence}`}
      className={className}
    >
      ★ {influence}
    </Badge>
  )
}

const Badge = styled.span<{
  $tier: InfluenceTier
  $variant: 'overlay' | 'inline'
}>`
  display: inline-flex;
  align-items: center;
  gap: 2px;
  padding: 2px 5px 2px 4px;
  font-size: 9px;
  font-weight: 700;
  line-height: 1;
  color: #fff;
  border-radius: 8px;
  letter-spacing: 0.01em;
  font-variant-numeric: tabular-nums;
  opacity: 0.92;
  background: ${({ $tier }) =>
    $tier === 'top'
      ? 'linear-gradient(135deg, #d97706, #b45309)'
      : $tier === 'high'
        ? '#c2780b'
        : $tier === 'mid'
          ? '#4f46e5'
          : 'rgba(100,116,139,0.75)'};

  ${({ $variant }) =>
    $variant === 'overlay' &&
    `
      position: absolute;
      top: 7px;
      right: 7px;
      z-index: 2;
      backdrop-filter: blur(4px);
    `}
`
