/**
 * 행정조직(국가 상세) 서브탭 — GovernmentInfoSection 전용
 */
export type GovernmentContentTab =
  | 'system'
  | 'heads'
  | 'statistics'
  | 'ministries'
  | 'cabinets'
  | 'organizations'
  | 'positions'

export type GovernmentTabMeta = { label: string; hint: string }

export const GOV_TAB_META: Record<GovernmentContentTab, GovernmentTabMeta> = {
  system: {
    label: '정체',
    hint: '대통령제·의원내각제 같은 정부 형태와 단원제·양원제를 시대별로 기록합니다. 정체는 바뀌므로 기간을 가진 여러 줄로 남깁니다.',
  },
  heads: {
    label: '역대 수반',
    hint: '군주(왕·황제·천황) 재위와 국가원수 임기를 관리합니다. 총리·대통령 등 정부수반은 「행정부」 탭에서.',
  },
  cabinets: {
    label: '행정부',
    hint: '총리·대통령 등 정부수반의 임기와 각료 구성을 관리합니다. 수반 임기를 등록하면 행정부가 함께 만들어집니다.',
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
  // 정체가 맨 앞 — 누가 수반인지보다 "어떤 체제인지"가 먼저 읽혀야 한다
  'system',
  'heads',
  'cabinets',
  'ministries',
  'organizations',
  'positions',
  'statistics',
] as const
