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

/**
 * tier별 글자/배경 — top·high만 amber 톤으로 강조, mid·low는 슬레이트 단조.
 * 톤이 amber/indigo로 갈리던 문제 정리.
 */
export function getInfluenceTierColor(tier: InfluenceTier): string {
  switch (tier) {
    case 'top':
      return '#92400e'
    case 'high':
      return '#a16207'
    case 'mid':
      return '#475569'
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
      return '#e2e8f0'
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
