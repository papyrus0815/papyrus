/**
 * 인물의 역사적 영향력(0-100)을 4단계 티어로 분류.
 * 카드 뱃지·상세 패널 바·슬라이더 anchor 등 UI 전반에서 이 파일을 단일 진실로 사용.
 *
 * 경계값 근거:
 * - 30 미만: 보조적·짧거나 무력했던 치세, 이름만 남은 인물
 * - 30–59: 지역·국가 단위로 존재감
 * - 60–79: 대륙·시대에 영향, 뚜렷한 족적
 * - 80+: 세계사 전환급
 */

export type InfluenceTier = 'low' | 'mid' | 'high' | 'top'

/** tier 경계값 — anchor·필터에서도 동일 기준 사용 */
export const INFLUENCE_TIER_THRESHOLDS = {
  low: 1,
  mid: 30,
  high: 60,
  top: 80,
} as const

/** null → 표시 안 함, 0 초과만 티어 반환 */
export function getInfluenceTier(
  influence: number | null | undefined,
): InfluenceTier | null {
  if (influence == null) return null
  if (influence >= INFLUENCE_TIER_THRESHOLDS.top) return 'top'
  if (influence >= INFLUENCE_TIER_THRESHOLDS.high) return 'high'
  if (influence >= INFLUENCE_TIER_THRESHOLDS.mid) return 'mid'
  if (influence >= INFLUENCE_TIER_THRESHOLDS.low) return 'low'
  return null
}

/** 티어별 대표 색상 (단색 pill 배경·텍스트 용도) */
export function getInfluenceTierColor(tier: InfluenceTier): string {
  switch (tier) {
    case 'top':
      return '#d97706' // amber
    case 'high':
      return '#f59e0b'
    case 'mid':
      return '#6366f1' // indigo
    case 'low':
      return '#64748b' // slate
  }
}

/** 상세 패널 바(Fill)·뱃지 그라데이션 — tier 색 계열에서 두 톤 */
export function getInfluenceTierGradient(tier: InfluenceTier): string {
  switch (tier) {
    case 'top':
      return 'linear-gradient(90deg, #f59e0b 0%, #b45309 100%)'
    case 'high':
      return 'linear-gradient(90deg, #fbbf24 0%, #d97706 100%)'
    case 'mid':
      return 'linear-gradient(90deg, #818cf8 0%, #4f46e5 100%)'
    case 'low':
      return 'linear-gradient(90deg, #94a3b8 0%, #64748b 100%)'
  }
}

/** 티어 한글 라벨 — 숫자 옆 병기용 */
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

/**
 * 상세 패널 슬라이더/바 anchor — tier 경계값과 라벨.
 * tier 경계를 그대로 사용하므로 "밑줄은 indigo인데 뱃지는 amber" 같은 불일치가 발생하지 않음.
 */
export const INFLUENCE_ANCHORS: Array<{
  value: number
  label: string
  tier: InfluenceTier | null
}> = [
  { value: 0, label: '없음', tier: null },
  {
    value: INFLUENCE_TIER_THRESHOLDS.mid,
    label: '국가·지역',
    tier: 'mid',
  },
  {
    value: INFLUENCE_TIER_THRESHOLDS.high,
    label: '대륙',
    tier: 'high',
  },
  {
    value: INFLUENCE_TIER_THRESHOLDS.top,
    label: '시대',
    tier: 'top',
  },
  { value: 100, label: '세계사 전환', tier: 'top' },
]
