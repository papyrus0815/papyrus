/**
 * 사건 유형 레지스트리 — **"이 사건에는 무엇을 기록하는가"의 단일 정본.**
 *
 * 사건에는 두 축이 있다.
 *  - 유형(형식, Event.type): 전투인가, 조약 체결인가, 즉위인가 — **기록할 데이터를 정한다.**
 *  - 분야(Event.category): 정치·외교·군사·경제… — 무엇에 관한 사건인가. 색과 분류 필터.
 * 예전엔 카테고리 한 칸에 둘이 섞여, '전쟁/군사' 159건 안에 전투·함대법·참모총장 취임·장관의 휴양이
 * 함께 들어 있었다. 함대법은 분야로는 군사지만 형식은 법률이라 진영이 아니라 제정 주체가 필요하다.
 *
 * 등록 모달(핵심 기록 칸)·상세(섹션 순서·빈 섹션 안내·모듈 추천)·조망 점검표·수장 지도(교전선 판정)가
 * 전부 이 표를 읽는다. 지면마다 따로 분기하던 것(category-features·제목 정규식)을 대체한다.
 *
 * ⚠️ 이 표는 **권하고 묻는 것**만 정한다 — 유형으로 기록을 막지 않는다. 전쟁은 조약으로 끝나고
 * 봉기에도 진영이 있다. 표에 없는 기록도 상세의 '다른 기능'에서 그대로 쓸 수 있다.
 * 서버는 값(EventType enum)만 보관한다 — apps/api/src/libs/event/domain/event-type.ts.
 */

export type EventTypeKey =
  | 'WAR'
  | 'BATTLE'
  | 'UPRISING'
  | 'ATTACK'
  | 'MILITARY_MEASURE'
  | 'TREATY'
  | 'SUMMIT'
  | 'DIPLOMATIC_ACT'
  | 'CRISIS'
  | 'STATEHOOD'
  | 'POWER_CHANGE'
  | 'ELECTION'
  | 'LAW_POLICY'
  | 'INSTITUTION'
  | 'EXPANSION'
  | 'INCIDENT'
  | 'COMPANY'
  | 'MARKET'
  | 'PRODUCT'
  | 'CONSTRUCTION'
  | 'DISASTER'
  | 'SCIENCE'
  | 'CULTURE_RELIGION'
  | 'MIGRATION'
  | 'PERSONAL'
  | 'OTHER'

/**
 * 기록(facet) — 사건에 붙는 데이터 덩어리. 각각 상세의 한 섹션·모듈이고 서버의 한 관계다.
 *  participants 참여국(역할)    · persons 참여 인물      · sides 진영(교전 양측)
 *  metrics 수치(지표·출처)      · military 작전 정보     · treaty 맺어진 조약
 *  statehood 성립·소멸 국가     · power 취임·즉위 기록   · election 선거
 *  organizations 기업·조직      · cabinets 관련 행정부
 */
export type EventFacetKey =
  | 'participants'
  | 'persons'
  | 'sides'
  | 'metrics'
  | 'military'
  | 'treaty'
  | 'statehood'
  | 'power'
  | 'election'
  | 'organizations'
  | 'cabinets'

export const FACET_LABEL: Record<EventFacetKey, string> = {
  participants: '참여국',
  persons: '참여 인물',
  sides: '진영',
  metrics: '수치',
  military: '작전 정보',
  treaty: '맺어진 조약',
  statehood: '성립·소멸 국가',
  power: '취임·즉위',
  election: '선거',
  organizations: '기업·조직',
  cabinets: '관련 행정부',
}

export type EventTypeFamilyKey = 'conflict' | 'diplomacy' | 'state' | 'economy' | 'society' | 'other'

export interface EventTypeFamily {
  key: EventTypeFamilyKey
  label: string
  types: EventTypeKey[]
}

export interface EventTypeMetrics {
  /** 모듈 추가 메뉴의 수치 항목 라벨 */
  menuLabel: string
  /** 수치가 하나도 없을 때 안내문 */
  emptyHint: string
  /** 지표 선택 맨 위 '자주 쓰는 지표' — metric_definition.key (DB에 없는 키는 조용히 건너뜀) */
  presets: string[]
  /** 수치 입력 시 처음 고를 대상 — 진영별 값이 정본인 유형은 진영 */
  subject: 'side' | 'event'
}

export interface EventTypeDef {
  key: EventTypeKey
  /** 칩·배지 라벨 */
  label: string
  family: EventTypeFamilyKey
  /** 고를 때 돕는 예 */
  examples: string
  /** 분야를 아직 안 골랐을 때 채울 기본 분야(DB EventCategory.name) */
  defaultDomain: string
  /** 보통 하위 사건을 거느리는 형식 — 등록 때 '묶음 사건'을 기본으로 권한다 */
  usuallyCollection?: boolean
  /** 핵심 기록 — 등록 모달에서 바로 묻고, 상세에서 비어 있어도 접지 않고 채우기를 권한다 */
  core: EventFacetKey[]
  /** 선택 기록 — 상세 '이 유형에 맞는 기능'으로 권한다 */
  optional: EventFacetKey[]
  metrics: EventTypeMetrics
}

const GENERIC_METRICS: EventTypeMetrics = {
  menuLabel: '수치',
  emptyHint: '이 사건의 숫자를 출처와 함께 기록하면 여기 모입니다.',
  presets: [],
  subject: 'event',
}

const WAR_METRICS: EventTypeMetrics = {
  menuLabel: '수치 (병력·사상자·비용)',
  emptyHint: '병력·사상자·비용 같은 숫자를 출처와 함께 기록하면 진영별 비교가 여기 그려집니다.',
  presets: [
    'military.personnel',
    'military.killed_in_action',
    'military.wounded',
    'military.casualties_total',
    'civilian.killed',
    'economy.war_expenditure',
  ],
  subject: 'side',
}

const SOCIETY_METRICS: EventTypeMetrics = {
  menuLabel: '수치 (참여 인원·피해 규모)',
  emptyHint: '참여 인원이나 사망·부상 같은 피해 규모를 출처와 함께 기록하면 여기 모입니다.',
  presets: ['society.participants', 'human.deaths_total', 'civilian.killed', 'civilian.wounded'],
  subject: 'event',
}

const ECONOMY_METRICS: EventTypeMetrics = {
  menuLabel: '수치 (지수·시가총액·금리)',
  emptyHint: '지수 종가·수익률·시가총액·금리 같은 숫자를 출처와 함께 기록하면 여기 모입니다.',
  presets: [
    'economy.index_close',
    'economy.return_rate',
    'economy.market_cap',
    'economy.interest_rate',
    'economy.capital',
    'economy.loss',
  ],
  subject: 'event',
}

const DISASTER_METRICS: EventTypeMetrics = {
  menuLabel: '수치 (피해 규모)',
  emptyHint: '사망·부상·이재민·재산 피해 같은 숫자를 출처와 함께 기록하면 여기 모입니다.',
  presets: [
    'human.deaths_total',
    'civilian.wounded',
    'civilian.displaced',
    'disaster.magnitude',
    'disaster.buildings_destroyed',
    'economy.loss',
  ],
  subject: 'event',
}

const TERRITORY_METRICS: EventTypeMetrics = {
  menuLabel: '수치 (인구·영토)',
  emptyHint: '성립·소멸 당시의 인구나 영토 같은 숫자를 출처와 함께 기록하면 여기 모입니다.',
  presets: ['demography.population', 'territory.area_ceded'],
  subject: 'event',
}

const TREATY_METRICS: EventTypeMetrics = {
  menuLabel: '수치 (배상금·할양 면적)',
  emptyHint: '배상금·할양 면적처럼 조약이 정한 숫자를 출처와 함께 기록하면 여기 모입니다.',
  presets: ['economy.indemnity', 'territory.area_ceded', 'demography.population'],
  subject: 'event',
}

export const EVENT_TYPES: Record<EventTypeKey, EventTypeDef> = {
  // ── 무력 충돌 ──────────────────────────────────────────────────────────
  WAR: {
    key: 'WAR', label: '전쟁', family: 'conflict', examples: '크림 전쟁 · 30년 전쟁',
    defaultDomain: '군사', usuallyCollection: true,
    core: ['sides', 'participants'], optional: ['metrics', 'military', 'treaty', 'persons'],
    metrics: WAR_METRICS,
  },
  BATTLE: {
    key: 'BATTLE', label: '전투·작전', family: 'conflict', examples: '스당 전투 · 인천상륙작전 · 함락·점령 · 전쟁의 한 국면',
    defaultDomain: '군사',
    core: ['sides', 'participants'], optional: ['metrics', 'military', 'persons'],
    metrics: WAR_METRICS,
  },
  UPRISING: {
    key: 'UPRISING', label: '봉기·혁명', family: 'conflict', examples: '우창봉기 · 명예혁명 · 정변 · 저항 운동',
    defaultDomain: '사회',
    core: ['sides', 'participants'], optional: ['persons', 'metrics'],
    metrics: SOCIETY_METRICS,
  },
  ATTACK: {
    key: 'ATTACK', label: '암살·테러·학살', family: 'conflict', examples: '사라예보 암살 · 블랙 홀 사건',
    defaultDomain: '정치',
    core: ['persons', 'participants'], optional: ['metrics'],
    metrics: SOCIETY_METRICS,
  },
  MILITARY_MEASURE: {
    key: 'MILITARY_MEASURE', label: '군사 조치', family: 'conflict', examples: '총동원령 · 기동훈련 · 함대 배치 · 작전 지령',
    defaultDomain: '군사',
    core: ['participants'], optional: ['military', 'metrics', 'persons'],
    metrics: { ...WAR_METRICS, subject: 'event' },
  },
  // ── 외교 ───────────────────────────────────────────────────────────────
  TREATY: {
    key: 'TREATY', label: '조약·협정', family: 'diplomacy', examples: '난징 조약 체결 · 삼국 동맹 · 휴전협정',
    defaultDomain: '외교',
    core: ['treaty', 'participants'], optional: ['persons', 'metrics'],
    metrics: TREATY_METRICS,
  },
  SUMMIT: {
    key: 'SUMMIT', label: '회담·회의', family: 'diplomacy', examples: '베를린 회의 · 포츠담 회담 · 어전회의',
    defaultDomain: '외교',
    core: ['participants', 'persons'], optional: ['treaty'],
    metrics: GENERIC_METRICS,
  },
  DIPLOMATIC_ACT: {
    key: 'DIPLOMATIC_ACT', label: '외교 조치', family: 'diplomacy', examples: '최후통첩 · 선전포고 · 국빈 방문 · 가입 · 성명',
    defaultDomain: '외교',
    core: ['participants'], optional: ['persons', 'treaty'],
    metrics: GENERIC_METRICS,
  },
  CRISIS: {
    key: 'CRISIS', label: '외교 위기', family: 'diplomacy', examples: '보스니아 위기 · 대동방위기',
    defaultDomain: '외교', usuallyCollection: true,
    core: ['participants'], optional: ['sides', 'treaty', 'persons'],
    metrics: GENERIC_METRICS,
  },
  // ── 국가·권력 ──────────────────────────────────────────────────────────
  STATEHOOD: {
    key: 'STATEHOOD', label: '건국·멸망', family: 'state', examples: '청나라 건국 · 서로마 제국 멸망 · 병합 · 독립 선언',
    defaultDomain: '정치',
    core: ['statehood'], optional: ['persons', 'power', 'metrics'],
    metrics: TERRITORY_METRICS,
  },
  POWER_CHANGE: {
    key: 'POWER_CHANGE', label: '즉위·취임', family: 'state', examples: '대통령 취임 · 즉위 · 실각 · 정권 붕괴',
    defaultDomain: '정치',
    core: ['power'], optional: ['persons', 'participants'],
    metrics: GENERIC_METRICS,
  },
  ELECTION: {
    key: 'ELECTION', label: '선거', family: 'state', examples: '총선 · 대통령 선거 · 국왕 선출',
    defaultDomain: '정치',
    core: ['election'], optional: ['power', 'participants'],
    metrics: { ...GENERIC_METRICS, presets: ['society.participants'] },
  },
  LAW_POLICY: {
    key: 'LAW_POLICY', label: '법·정책·개혁', family: 'state', examples: '헌법 공포 · 함대법 · 탄지마트 개혁 · 제도 도입',
    defaultDomain: '정치',
    core: ['participants'], optional: ['persons', 'cabinets', 'metrics'],
    metrics: GENERIC_METRICS,
  },
  INSTITUTION: {
    key: 'INSTITUTION', label: '기관·조직', family: 'state', examples: '참모본부 창설 · 정당 결성 · 국회 해산',
    defaultDomain: '정치',
    core: ['participants'], optional: ['organizations', 'persons'],
    metrics: GENERIC_METRICS,
  },
  EXPANSION: {
    key: 'EXPANSION', label: '진출·식민', family: 'state', examples: '동인도회사의 인도 진출 · 3B 정책',
    defaultDomain: '정치', usuallyCollection: true,
    core: ['participants'], optional: ['organizations', 'sides', 'treaty'],
    metrics: GENERIC_METRICS,
  },
  INCIDENT: {
    key: 'INCIDENT', label: '정치 사건', family: 'state', examples: '탄압 · 스캔들 · 음모 사건',
    defaultDomain: '정치',
    core: ['persons'], optional: ['participants'],
    metrics: GENERIC_METRICS,
  },
  // ── 경제·산업 ──────────────────────────────────────────────────────────
  COMPANY: {
    key: 'COMPANY', label: '기업', family: 'economy', examples: '설립 · 상장 · 실적 발표',
    defaultDomain: '경제',
    core: ['organizations'], optional: ['metrics', 'persons'],
    metrics: ECONOMY_METRICS,
  },
  MARKET: {
    key: 'MARKET', label: '시장·금융', family: 'economy', examples: '지수 마감 · 금리 · 차관 · 파동·위기',
    defaultDomain: '경제',
    core: ['metrics'], optional: ['organizations', 'participants'],
    metrics: ECONOMY_METRICS,
  },
  PRODUCT: {
    key: 'PRODUCT', label: '제품·기술 발표', family: 'economy', examples: 'ChatGPT 출시 · 칩 아키텍처 공개',
    defaultDomain: '경제',
    core: ['organizations'], optional: ['metrics', 'persons'],
    metrics: ECONOMY_METRICS,
  },
  CONSTRUCTION: {
    key: 'CONSTRUCTION', label: '건설·개통', family: 'economy', examples: '철도 개통 · 가스관 가동 · 대교·터널',
    defaultDomain: '과학기술',
    core: ['participants'], optional: ['organizations', 'metrics'],
    metrics: GENERIC_METRICS,
  },
  // ── 사회·문화 ──────────────────────────────────────────────────────────
  DISASTER: {
    key: 'DISASTER', label: '재해·사고', family: 'society', examples: '지진 · 대화재 · 폭발 사고',
    defaultDomain: '사회',
    core: ['metrics'], optional: ['participants'],
    metrics: DISASTER_METRICS,
  },
  SCIENCE: {
    key: 'SCIENCE', label: '학술·발견', family: 'society', examples: '법칙 발표 · 노벨상 · 발견',
    defaultDomain: '과학기술',
    core: ['persons'], optional: ['organizations'],
    metrics: GENERIC_METRICS,
  },
  CULTURE_RELIGION: {
    key: 'CULTURE_RELIGION', label: '문화·종교', family: 'society', examples: '문자 창제 · 개종 · 출판',
    defaultDomain: '문화',
    core: ['participants'], optional: ['persons'],
    metrics: GENERIC_METRICS,
  },
  MIGRATION: {
    key: 'MIGRATION', label: '이주·천도', family: 'society', examples: '민족 대이동 · 천도 · 이민선',
    defaultDomain: '사회',
    core: ['participants'], optional: ['metrics'],
    metrics: { ...GENERIC_METRICS, presets: ['demography.population'] },
  },
  PERSONAL: {
    key: 'PERSONAL', label: '인물 행적', family: 'society', examples: '요양·휴가 · 여행 · 건강 이상',
    defaultDomain: '정치',
    core: ['persons'], optional: [],
    metrics: GENERIC_METRICS,
  },
  // ── 기타 ───────────────────────────────────────────────────────────────
  OTHER: {
    key: 'OTHER', label: '기타', family: 'other', examples: '어디에도 맞지 않을 때',
    defaultDomain: '기타',
    core: [], optional: ['participants', 'persons', 'metrics'],
    metrics: GENERIC_METRICS,
  },
}

export const EVENT_TYPE_FAMILIES: EventTypeFamily[] = [
  { key: 'conflict', label: '무력 충돌', types: ['WAR', 'BATTLE', 'UPRISING', 'ATTACK', 'MILITARY_MEASURE'] },
  { key: 'diplomacy', label: '외교', types: ['TREATY', 'SUMMIT', 'DIPLOMATIC_ACT', 'CRISIS'] },
  {
    key: 'state',
    label: '국가·권력',
    types: ['STATEHOOD', 'POWER_CHANGE', 'ELECTION', 'LAW_POLICY', 'INSTITUTION', 'EXPANSION', 'INCIDENT'],
  },
  { key: 'economy', label: '경제·산업', types: ['COMPANY', 'MARKET', 'PRODUCT', 'CONSTRUCTION'] },
  { key: 'society', label: '사회·문화', types: ['DISASTER', 'SCIENCE', 'CULTURE_RELIGION', 'MIGRATION', 'PERSONAL'] },
  { key: 'other', label: '기타', types: ['OTHER'] },
]

const isTypeKey = (value: unknown): value is EventTypeKey =>
  typeof value === 'string' && value in EVENT_TYPES

/** 유형 정의 — 모르는 값·미지정은 기타 */
export function eventTypeDef(type?: string | null): EventTypeDef {
  return isTypeKey(type) ? EVENT_TYPES[type] : EVENT_TYPES.OTHER
}

/** 이 유형에서 기록의 무게 — 핵심·선택·없음 */
export function facetWeight(type: string | null | undefined, facet: EventFacetKey): 'core' | 'optional' | null {
  const def = eventTypeDef(type)
  if (def.core.includes(facet)) return 'core'
  if (def.optional.includes(facet)) return 'optional'
  return null
}

/** 무력 충돌인가 — 교전선(수장 지도)·진영 초안의 판정. 제목 정규식으로 추리던 것을 대체한다 */
export const isArmedConflictType = (type?: string | null): boolean =>
  type === 'WAR' || type === 'BATTLE' || type === 'UPRISING'

/** 상세 '모듈 추가'로 켜는 모듈 — 기록 중 모듈로 붙는 것 */
export type TypeModuleKey = 'sides' | 'metrics' | 'military-details'

const MODULE_OF_FACET: Partial<Record<EventFacetKey, TypeModuleKey>> = {
  sides: 'sides',
  metrics: 'metrics',
  military: 'military-details',
}

/**
 * 상세 지면이 읽는 유형별 기능 — 레지스트리에서 계산한다(옛 category-features의 자리).
 *  - suggestedModules: 핵심 → 선택 순의 모듈
 *  - promoteTreaties: 조약이 핵심인 유형은 조약 섹션을 본문 바로 뒤로, 비어도 접지 않음
 *  - expect*: 그 기록이 핵심·선택인 유형은 비어 있어도 섹션을 세워 연결을 권함
 */
export interface EventTypeFeatures {
  suggestedModules: TypeModuleKey[]
  metricsMenuLabel: string
  metricsEmptyHint: string
  metricPresets: string[]
  metricSubject: 'side' | 'event'
  promoteTreaties: boolean
  expectStatehood: boolean
  expectPower: boolean
  expectOrganizations: boolean
}

export function eventTypeFeatures(type?: string | null): EventTypeFeatures {
  const def = eventTypeDef(type)
  const facets = [...def.core, ...def.optional]
  const modules = facets
    .map((facet) => MODULE_OF_FACET[facet])
    .filter((module): module is TypeModuleKey => Boolean(module))
  return {
    suggestedModules: [...new Set(modules)],
    metricsMenuLabel: def.metrics.menuLabel,
    metricsEmptyHint: def.metrics.emptyHint,
    metricPresets: def.metrics.presets,
    metricSubject: def.metrics.subject,
    promoteTreaties: def.core.includes('treaty'),
    expectStatehood: facets.includes('statehood'),
    expectPower: facets.includes('power') || facets.includes('election'),
    expectOrganizations: facets.includes('organizations'),
  }
}
