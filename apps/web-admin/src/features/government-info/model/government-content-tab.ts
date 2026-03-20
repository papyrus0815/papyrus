/**
 * 행정조직(국가 상세) 서브탭 — GovernmentInfoSection 전용
 */
export type GovernmentContentTab =
  | 'heads'
  | 'statistics'
  | 'ministries'
  | 'cabinets'
  | 'organizations'
  | 'positions'

export const GOV_TAB_META: Record<GovernmentContentTab, { label: string }> = {
  heads: {
    label: '역대 수반',
  },
  cabinets: {
    label: '행정부',
  },
  ministries: {
    label: '중앙부처',
  },
  organizations: {
    label: '행정기구',
  },
  positions: {
    label: '직위 정의',
  },
  statistics: {
    label: '통계',
  },
}
