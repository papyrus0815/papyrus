/**
 * 인물의 역사적 영향력(0-100)을 4단계 티어로 분류.
 * web-admin/src/shared/lib/influence-tier.ts 미러.
 */

export type InfluenceTier = 'low' | 'mid' | 'high' | 'top'

export const INFLUENCE_TIER_THRESHOLDS = {
  low: 1,
  mid: 30,
  high: 60,
  top: 80,
} as const

export function getInfluenceTier(influence: number | null | undefined): InfluenceTier | null {
  if (influence == null) return null
  if (influence >= INFLUENCE_TIER_THRESHOLDS.top) return 'top'
  if (influence >= INFLUENCE_TIER_THRESHOLDS.high) return 'high'
  if (influence >= INFLUENCE_TIER_THRESHOLDS.mid) return 'mid'
  if (influence >= INFLUENCE_TIER_THRESHOLDS.low) return 'low'
  return null
}

export function getInfluenceTierColor(tier: InfluenceTier): string {
  switch (tier) {
    case 'top':
      return '#d97706'
    case 'high':
      return '#f59e0b'
    case 'mid':
      return '#6366f1'
    case 'low':
      return '#64748b'
  }
}

export function getInfluenceTierBg(tier: InfluenceTier): string {
  switch (tier) {
    case 'top':
      return '#fef3c7'
    case 'high':
      return '#fef9c3'
    case 'mid':
      return '#e0e7ff'
    case 'low':
      return '#f1f5f9'
  }
}

export function getInfluenceTierLabel(tier: InfluenceTier): string {
  switch (tier) {
    case 'top':
      return '시대급'
    case 'high':
      return '대륙급'
    case 'mid':
      return '국가·지역급'
    case 'low':
      return '미미'
  }
}
