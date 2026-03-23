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

export type GovernmentTabMeta = { label: string; hint: string }

export const GOV_TAB_META: Record<GovernmentContentTab, GovernmentTabMeta> = {
  heads: {
    label: '역대 수반',
    hint: '국가별 재임 기록과 인물 정보를 조회·수정합니다.',
  },
  cabinets: {
    label: '행정부',
    hint: '정권별 행정부와 각료 구성을 관리합니다.',
  },
  ministries: {
    label: '중앙부처',
    hint: '카테고리별 중앙부처를 검색·등록·수정합니다.',
  },
  organizations: {
    label: '행정기구',
    hint: '행정기구·조직을 검색하고 국가별로 관리합니다.',
  },
  positions: {
    label: '직위 정의',
    hint: '관직·직위를 정의하고 관리합니다.',
  },
  statistics: {
    label: '통계',
    hint: '행정조직 규모와 추이를 한눈에 확인합니다.',
  },
}

/** 탭 버튼 순서(Object.keys 순서에 의존하지 않음) */
export const GOVERNMENT_TAB_ORDER: readonly GovernmentContentTab[] = [
  'heads',
  'cabinets',
  'ministries',
  'organizations',
  'positions',
  'statistics',
] as const
