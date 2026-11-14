/**
 * 정부·행정(국가 상세) 서브탭 — GovernmentInfoSection 전용
 * 군사 사령부·부대는 최상위 「군사」 탭(`CountryMilitarySection`)으로 승격되었으며,
 * 직위·보직은 기관/부대/인물에서 즉시 생성·자동 해석한다.
 */
export type GovernmentContentTab =
  | 'system'
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
  cabinets: {
    label: '행정부·내각',
    hint: '정부수반 임기별 내각 구성과 소속 각료·조약·주요 업적을 한 화면에서 관리합니다.',
  },
  ministries: {
    label: '중앙부처·국가기관',
    hint: '중앙부처(성·부·6조)·외청·총독부·궁내 기관의 상하 위계, 전신·후신 계보, 역대 장관·수장을 관리합니다.',
  },
  positions: {
    label: '직위·서열',
    hint: '이 국가에서 쓰이는 관직·직위의 명칭, 위계 구분, 서열(Rank) 및 소속 부처를 관리합니다.',
  },
  statistics: {
    label: '통계·연혁',
    hint: '행정조직 분포와 부처 설립·개편·폐지 연혁 지표를 한눈에 확인합니다.',
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
  'cabinets',
  'ministries',
  'positions',
  'statistics',
] as const
