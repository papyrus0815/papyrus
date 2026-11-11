/**
 * 정부·행정(국가 상세) 서브탭 — GovernmentInfoSection 전용
 * 군사 사령부·부대는 최상위 「군사」 탭(`CountryMilitarySection`)으로 승격되었으며,
 * 직위·보직은 기관/부대/인물에서 즉시 생성·자동 해석한다.
 */
export type GovernmentContentTab =
  | 'system'
  | 'heads'
  | 'cabinets'
  | 'ministries'
  | 'statistics'
  | 'positions'
  | 'organizations'
  | 'military'

export type GovernmentTabMeta = { label: string; hint: string }

export const GOV_TAB_META: Record<GovernmentContentTab, GovernmentTabMeta> = {
  system: {
    label: '정체·헌정',
    hint: '군주제·공화제·의원내각제 같은 정부 형태와 의회 구조를 시대별로 기록합니다.',
  },
  heads: {
    label: '역대 수반 (군주·원수)',
    hint: '국왕·황제·최고지도자·대통령 등 역대 국가원수·정부수반의 재위·재임 연대표를 관리합니다.',
  },
  cabinets: {
    label: '행정부·내각',
    hint: '정부수반·군주 임기별 내각과 소속 각료·부처 구성을 한 화면에서 등록·관리합니다.',
  },
  ministries: {
    label: '중앙부처·국가기관',
    hint: '중앙부처(국방부·외무성·6조 등)·외청·총독부·궁내 기관의 계층, 개편 계보, 역대 수장을 관리합니다.',
  },
  statistics: {
    label: '통계',
    hint: '정부·행정 조직 규모와 추이를 한눈에 확인합니다.',
  },
  positions: {
    label: '직위·서열 사전',
    hint: '이 국가에서 쓰이는 관직·직위의 명칭, 위계 구분, 서열(Rank) 및 소속 부처를 관리합니다.',
  },
  military: {
    label: '군사',
    hint: '최고사령부·참모본부·야전군·사단·함대 등 군 지휘 계통을 관리합니다.',
  },
  organizations: {
    label: '사회단체',
    hint: '사회단체 등을 관리합니다.',
  },
}

/** 상단 서브탭 바에 실제 노출하는 5개 핵심 탭 */
export const GOVERNMENT_TAB_ORDER: readonly GovernmentContentTab[] = [
  'system',
  'heads',
  'cabinets',
  'ministries',
  'statistics',
] as const
