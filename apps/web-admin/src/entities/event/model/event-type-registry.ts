/**
 * 사건 세부 분야 레지스트리 — **분야의 2단계(분야 › 세부)이자 "이 사건에는 무엇을 기록하는가"의 단일 정본.**
 *
 *  - 분야(Event.domain, 9종·필수): 무엇에 관한 일인가 — 정치·외교·군사·경제… 색·필터의 기준(event-domain.ts).
 *  - 세부(Event.type, 28종·선택): 어떤 꼴의 일인가 — 전투·조약·법령·즉위… 찾아보기의 2단계이고
 *    **붙는 기록을 정한다**(전투 → 교전 양측, 조약 → 맺어진 조약, 즉위 → 재임 기록).
 *
 * 화면은 '군사 › 법령·정책·개혁' 한 줄의 2단 분류로 보이지만 **저장은 독립된 두 축**이다. 실측 452건에서
 * (분야, 세부) 조합이 61가지였고 법령·조약·봉기·회의·건설이 3~5개 분야에 걸쳤다 — 트리로 저장하면 잎을
 * 분야마다 복제하거나 사건의 분야를 트리에 맞춰 바꿔야 한다. 그래서 어떤 분야든 어떤 세부와도 짝지을 수
 * 있고, 분야마다 **앞에 보일 세부**만 정한다(DOMAIN_SUBTYPES — 나머지는 '더 보기').
 *
 * 세부 이름에는 분야를 넣지 않는다(옛 '외교 조치'·'군사 조치'·'정치 사건'이 분야와 겹쳐 보인 원인).
 * 수치 프리셋처럼 주제를 따르는 것은 세부가 정하지 않으면 분야에서 온다(metricsFor).
 *
 * 등록 모달(세부 칩·기록 칸)·상세(섹션 순서·빈 섹션 안내·모듈 추천)·조망 점검표·수장 지도(교전선 판정)가
 * 전부 이 표를 읽는다.
 *
 * ⚠️ 이 표는 **권하고 묻는 것**만 정한다 — 세부로 기록을 막지 않는다. 전쟁은 조약으로 끝나고
 * 봉기에도 진영이 있다. 서버는 값(EventType enum)만 보관한다 — apps/api/src/libs/event/domain/event-type.ts.
 */

import { domainLabel, type EventDomainKey, isEventDomainKey } from './event-domain'

export type EventTypeKey =
  | 'WAR'
  | 'BATTLE'
  | 'UPRISING'
  | 'ATTACK'
  | 'MOBILIZATION'
  | 'TREATY'
  | 'SUMMIT'
  | 'DECLARATION'
  | 'VISIT'
  | 'CRISIS'
  | 'EXPANSION'
  | 'STATEHOOD'
  | 'POWER_CHANGE'
  | 'ELECTION'
  | 'LAW_POLICY'
  | 'INSTITUTION'
  | 'INCIDENT'
  | 'MOVEMENT'
  | 'COMPANY'
  | 'MARKET'
  | 'PRODUCT'
  | 'CONSTRUCTION'
  | 'DISASTER'
  | 'DISCOVERY'
  | 'CREATION'
  | 'CONVERSION'
  | 'MIGRATION'
  | 'PERSONAL'

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

export interface EventTypeMetrics {
  /** 모듈 추가 메뉴의 수치 항목 라벨 */
  menuLabel: string
  /** 수치가 하나도 없을 때 안내문 */
  emptyHint: string
  /** 지표 선택 맨 위 '자주 쓰는 지표' — metric_definition.key (DB에 없는 키는 조용히 건너뜀) */
  presets: string[]
  /** 수치 입력 시 처음 고를 대상 — 진영별 값이 정본인 세부는 진영 */
  subject: 'side' | 'event'
}

export interface EventTypeDef {
  key: EventTypeKey
  /** 칩·배지 라벨 */
  label: string
  /**
   * 두 글자 이름 — 목록의 좁은 분류 칸('군사 법령')용. 라벨을 잘라 만들지 않고 직접 정한다 —
   * '건국·멸망·병합'을 자르면 멸망 사건이 '건국'으로, '즉위·취임·실각'은 실각이 '즉위'로 읽힌다.
   */
  short: string
  /** 고를 때 돕는 예 */
  examples: string
  /** 보통 하위 사건을 거느리는 꼴 — 등록 때 '묶음 사건'을 기본으로 권한다 */
  usuallyCollection?: boolean
  /** 핵심 기록 — 등록 모달에서 바로 묻고, 상세에서 비어 있어도 접지 않고 채우기를 권한다 */
  core: EventFacetKey[]
  /** 선택 기록 — 상세 '이 사건에 맞는 기능'으로 권한다 */
  optional: EventFacetKey[]
  /** 세부가 수치의 성격을 정하는 경우(교전·조약·건국·재해·시장…). 없으면 분야를 따른다 */
  metrics?: EventTypeMetrics
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

/** 교전이 아닌 군사 사건(함대법·동원령·군제 개편) — 병력·예산을 사건 단위로 */
const MILITARY_DOMAIN_METRICS: EventTypeMetrics = {
  menuLabel: '수치 (병력·함선·예산)',
  emptyHint: '병력·함선 수·군사 예산 같은 숫자를 출처와 함께 기록하면 여기 모입니다.',
  presets: ['military.personnel', 'economy.war_expenditure'],
  subject: 'event',
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

/** 분야가 정하는 수치 — 세부가 수치의 성격을 정하지 않을 때 */
const METRICS_OF_DOMAIN: Partial<Record<EventDomainKey, EventTypeMetrics>> = {
  MILITARY: MILITARY_DOMAIN_METRICS,
  ECONOMY: ECONOMY_METRICS,
  SOCIETY: SOCIETY_METRICS,
}

/** 분야가 더 권하는 기록 — 세부의 선택 기록에 얹는다(군사 분야의 법령엔 작전 정보·수치, 경제엔 기업·수치) */
const OPTIONAL_OF_DOMAIN: Partial<Record<EventDomainKey, EventFacetKey[]>> = {
  MILITARY: ['military', 'metrics'],
  ECONOMY: ['organizations', 'metrics'],
  SOCIETY: ['metrics'],
  POLITICS: ['cabinets'],
}

const domainKey = (domain?: string | null): EventDomainKey | null => (isEventDomainKey(domain) ? domain : null)

export const EVENT_TYPES: Record<EventTypeKey, EventTypeDef> = {
  // ── 충돌 ──────────────────────────────────────────────────────────────
  WAR: {
    key: 'WAR', short: '전쟁', label: '전쟁', examples: '크림 전쟁 · 30년 전쟁', usuallyCollection: true,
    core: ['sides', 'participants'], optional: ['metrics', 'military', 'treaty', 'persons'],
    metrics: WAR_METRICS,
  },
  BATTLE: {
    key: 'BATTLE', short: '전투', label: '전투·작전', examples: '스당 전투 · 인천상륙작전 · 함락·점령 · 반란 진압',
    core: ['sides', 'participants'], optional: ['metrics', 'military', 'persons'],
    metrics: WAR_METRICS,
  },
  UPRISING: {
    key: 'UPRISING', short: '봉기', label: '봉기·혁명·정변', examples: '우창봉기 · 청년 튀르크 혁명 · 5월정변',
    core: ['sides', 'participants'], optional: ['persons', 'metrics'],
    metrics: SOCIETY_METRICS,
  },
  ATTACK: {
    key: 'ATTACK', short: '암살', label: '암살·테러·학살', examples: '사라예보 암살 · 블랙 홀 사건 · 가스관 폭파',
    core: ['persons', 'participants'], optional: ['metrics'],
    metrics: SOCIETY_METRICS,
  },
  MOBILIZATION: {
    key: 'MOBILIZATION', short: '동원', label: '동원·배치·지령', examples: '총동원령 · 기동훈련 · 함대 정박 · 작전 지령',
    core: ['participants'], optional: ['military', 'metrics', 'persons'],
    metrics: MILITARY_DOMAIN_METRICS,
  },
  // ── 국가 간 ────────────────────────────────────────────────────────────
  TREATY: {
    key: 'TREATY', short: '조약', label: '조약·협정·가입', examples: '난징 조약 · 삼국 동맹 · 철도 차관 협정 · NATO 가입',
    core: ['treaty', 'participants'], optional: ['persons', 'metrics'],
    metrics: TREATY_METRICS,
  },
  SUMMIT: {
    key: 'SUMMIT', short: '회담', label: '회담·회의·교섭', examples: '베를린 회의 · 어전회의 · 공의회 · 협정안 교섭 · 정상 통화',
    core: ['participants', 'persons'], optional: ['treaty'],
  },
  DECLARATION: {
    key: 'DECLARATION', short: '선언', label: '선언·통첩·연설', examples: '선전포고 · 최후통첩 · 중립 선언 · 예산 연설 · 결의',
    core: ['participants'], optional: ['persons', 'treaty'],
  },
  VISIT: {
    key: 'VISIT', short: '방문', label: '방문·사절', examples: '국빈 방문 · 함대 기항 · 사절단 · 흑선 내항',
    core: ['persons', 'participants'], optional: [],
  },
  CRISIS: {
    key: 'CRISIS', short: '위기', label: '위기', examples: '보스니아 위기 · 모로코 위기 · 대동방위기', usuallyCollection: true,
    core: ['participants'], optional: ['sides', 'treaty', 'persons'],
  },
  EXPANSION: {
    key: 'EXPANSION', short: '진출', label: '진출·식민', examples: '동인도회사의 인도 진출 · 3B 정책', usuallyCollection: true,
    core: ['participants'], optional: ['organizations', 'sides', 'treaty'],
  },
  // ── 국가·권력 ──────────────────────────────────────────────────────────
  STATEHOOD: {
    key: 'STATEHOOD', short: '흥망', label: '건국·멸망·병합', examples: '청나라 건국 · 서로마 멸망 · 병합 · 독립 선언',
    core: ['statehood'], optional: ['persons', 'power', 'metrics'],
    metrics: TERRITORY_METRICS,
  },
  POWER_CHANGE: {
    key: 'POWER_CHANGE', short: '권력', label: '즉위·취임·실각', examples: '즉위 · 대통령 취임 · 참모총장 취임 · 해임',
    core: ['power'], optional: ['persons', 'participants'],
  },
  ELECTION: {
    key: 'ELECTION', short: '선거', label: '선거', examples: '총선 · 대통령 선거 · 국왕 선출',
    core: ['election'], optional: ['power', 'participants'],
    metrics: { ...GENERIC_METRICS, presets: ['society.participants'] },
  },
  LAW_POLICY: {
    key: 'LAW_POLICY', short: '법령', label: '법령·정책·개혁', examples: '헌법 공포 · 함대법 · 탄지마트 · 토지 국유화',
    core: ['participants'], optional: ['persons', 'cabinets', 'metrics'],
  },
  INSTITUTION: {
    key: 'INSTITUTION', short: '설립', label: '기관·조직 설립', examples: '참모본부 창설 · 정당 결성 · 은행 개설 · 국회 해산',
    core: ['organizations'], optional: ['participants', 'persons'],
  },
  INCIDENT: {
    key: 'INCIDENT', short: '탄압', label: '탄압·음모·스캔들', examples: '화약 음모 · 안세이 대옥 · 의옥 사건',
    core: ['persons'], optional: ['participants'],
  },
  MOVEMENT: {
    key: 'MOVEMENT', short: '운동', label: '운동·캠페인', examples: '불매운동 · 여론 운동 · 국유화 반대 운동',
    core: ['participants'], optional: ['persons', 'metrics'],
    metrics: SOCIETY_METRICS,
  },
  // ── 경제·산업 ──────────────────────────────────────────────────────────
  COMPANY: {
    key: 'COMPANY', short: '기업', label: '기업 활동', examples: '설립 · 상장 · 실적 발표 · 인수',
    core: ['organizations'], optional: ['metrics', 'persons'],
    metrics: ECONOMY_METRICS,
  },
  MARKET: {
    key: 'MARKET', short: '시장', label: '시장·지표', examples: '지수 마감 · 금리 · 차관 · 파동',
    core: ['metrics'], optional: ['organizations', 'participants'],
    metrics: ECONOMY_METRICS,
  },
  PRODUCT: {
    key: 'PRODUCT', short: '제품', label: '제품·기술 발표', examples: 'ChatGPT 출시 · 칩 아키텍처 공개 · 로켓 퇴역',
    core: ['organizations'], optional: ['metrics', 'persons'],
    metrics: ECONOMY_METRICS,
  },
  CONSTRUCTION: {
    key: 'CONSTRUCTION', short: '건설', label: '건설·개통', examples: '철도 개통 · 가스관 가동 · 운하 · 전함 진수',
    core: ['participants'], optional: ['organizations', 'metrics'],
  },
  // ── 자연·학문·문화·사람 ────────────────────────────────────────────────
  DISASTER: {
    key: 'DISASTER', short: '재해', label: '재해·사고', examples: '지진 · 대화재 · 폭발 사고 · 역병',
    core: ['metrics'], optional: ['participants'],
    metrics: DISASTER_METRICS,
  },
  DISCOVERY: {
    key: 'DISCOVERY', short: '발견', label: '발견·학술', examples: '법칙 발표 · 노벨상 · 발견',
    core: ['persons'], optional: ['organizations'],
  },
  CREATION: {
    key: 'CREATION', short: '창작', label: '창제·저작·작품', examples: '문자 창제 · 책 출간 · 기념물 제작',
    core: ['persons'], optional: ['participants'],
  },
  CONVERSION: {
    key: 'CONVERSION', short: '개종', label: '개종·세례', examples: '폴란드의 세례 · 기독교 수용',
    core: ['participants'], optional: ['persons'],
  },
  MIGRATION: {
    key: 'MIGRATION', short: '이주', label: '이주·천도', examples: '민족 대이동 · 천도 · 교황청 이전 · 이민선',
    core: ['participants'], optional: ['metrics'],
    metrics: { ...GENERIC_METRICS, presets: ['demography.population'] },
  },
  PERSONAL: {
    key: 'PERSONAL', short: '행적', label: '인물 행적', examples: '요양·휴가 · 여행 · 건강 이상',
    core: ['persons'], optional: ['participants'],
  },
}

/** 모든 세부 — '더 보기'와 상세 선택지의 순서(충돌 → 국가 간 → 국가·권력 → 경제 → 자연·문화·사람) */
export const EVENT_TYPE_ORDER = Object.keys(EVENT_TYPES) as EventTypeKey[]

/**
 * 분야마다 **앞에 보일 세부** — 실데이터에서 그 분야에 실제로 쓰인 세부 + 자연스러운 것.
 * 나머지 세부도 '더 보기'로 고를 수 있다(저장은 독립 축). 기타는 앞줄이 없어 전부 보인다.
 */
export const DOMAIN_SUBTYPES: Partial<Record<EventDomainKey, EventTypeKey[]>> = {
  POLITICS: ['STATEHOOD', 'POWER_CHANGE', 'ELECTION', 'LAW_POLICY', 'INSTITUTION', 'UPRISING', 'INCIDENT', 'ATTACK', 'MOVEMENT', 'DECLARATION', 'PERSONAL'],
  DIPLOMACY: ['TREATY', 'SUMMIT', 'DECLARATION', 'VISIT', 'CRISIS', 'EXPANSION'],
  MILITARY: ['WAR', 'BATTLE', 'MOBILIZATION', 'LAW_POLICY', 'POWER_CHANGE', 'INSTITUTION', 'UPRISING', 'ATTACK', 'TREATY', 'SUMMIT', 'PERSONAL'],
  ECONOMY: ['COMPANY', 'MARKET', 'PRODUCT', 'CONSTRUCTION', 'LAW_POLICY', 'INSTITUTION', 'TREATY', 'MOVEMENT'],
  SOCIETY: ['UPRISING', 'MOVEMENT', 'DISASTER', 'MIGRATION', 'LAW_POLICY', 'CONSTRUCTION'],
  CULTURE: ['CREATION', 'CONSTRUCTION', 'VISIT'],
  RELIGION: ['CONVERSION', 'SUMMIT', 'LAW_POLICY', 'MIGRATION'],
  SCIENCE: ['DISCOVERY', 'PRODUCT', 'CONSTRUCTION'],
}

/** 분야의 앞줄 세부와 나머지 — 분야를 안 골랐거나 앞줄이 없는 분야(기타)는 전부 앞줄 */
export function subtypesForDomain(domain?: string | null): { primary: EventTypeKey[]; rest: EventTypeKey[] } {
  const key = domainKey(domain)
  const primary = (key ? DOMAIN_SUBTYPES[key] : undefined) ?? EVENT_TYPE_ORDER
  return { primary, rest: EVENT_TYPE_ORDER.filter((type) => !primary.includes(type)) }
}

/** 세부를 안 고른 사건의 기록 — 참여국이 핵심, 인물은 선택(분야가 선택 기록을 더 얹는다) */
const NO_SUBTYPE: Pick<EventTypeDef, 'core' | 'optional'> = { core: ['participants'], optional: ['persons'] }

export const isEventTypeKey = (value: unknown): value is EventTypeKey =>
  typeof value === 'string' && value in EVENT_TYPES

/** 세부 정의 — 모르는 값·미지정은 null(세부 없음) */
export function eventTypeDef(type?: string | null): EventTypeDef | null {
  return isEventTypeKey(type) ? EVENT_TYPES[type] : null
}

/** 세부 두 글자 이름 — 없으면 null */
export const eventTypeShort = (type?: string | null): string | null => eventTypeDef(type)?.short ?? null

/** 세부 라벨 — 없으면 null */
export const eventTypeLabel = (type?: string | null): string | null => eventTypeDef(type)?.label ?? null

/** '군사 › 법령·정책·개혁' — 세부가 없으면 분야만. domain은 분야 키(MILITARY…) */
export function formatDomainPath(domain?: string | null, type?: string | null): string {
  const label = eventTypeLabel(type)
  const head = domainLabel(domain)
  return label ? `${head} › ${label}` : head
}

/** 이 사건의 기록 — 세부의 핵심·선택에 분야가 권하는 선택 기록을 얹는다 */
export function typeFacets(
  type: string | null | undefined,
  domain?: string | null,
): { core: EventFacetKey[]; optional: EventFacetKey[] } {
  const def = eventTypeDef(type) ?? NO_SUBTYPE
  const key = domainKey(domain)
  const extra = (key ? OPTIONAL_OF_DOMAIN[key] : undefined) ?? []
  const optional = [...new Set([...def.optional, ...extra])].filter((facet) => !def.core.includes(facet))
  return { core: def.core, optional }
}

/** 이 사건의 수치 성격 — 세부가 정하면 세부, 아니면 분야 */
export function metricsFor(type: string | null | undefined, domain?: string | null): EventTypeMetrics {
  const key = domainKey(domain)
  return eventTypeDef(type)?.metrics ?? (key ? METRICS_OF_DOMAIN[key] : undefined) ?? GENERIC_METRICS
}

/** 이 사건에서 기록의 무게 — 핵심·선택·없음 */
export function facetWeight(
  type: string | null | undefined,
  facet: EventFacetKey,
  domain?: string | null,
): 'core' | 'optional' | null {
  const facets = typeFacets(type, domain)
  if (facets.core.includes(facet)) return 'core'
  if (facets.optional.includes(facet)) return 'optional'
  return null
}

/** 무력 충돌인가 — 교전선(수장 지도)·진영 초안의 판정 */
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
 * 상세 지면이 읽는 기능 — 세부와 분야로 계산한다.
 *  - suggestedModules: 핵심 → 선택 순의 모듈
 *  - promoteTreaties: 조약이 핵심인 세부는 조약 섹션을 본문 바로 뒤로, 비어도 접지 않음
 *  - expect*: 그 기록이 핵심·선택인 사건은 비어 있어도 섹션을 세워 연결을 권함
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

export function eventTypeFeatures(type?: string | null, domain?: string | null): EventTypeFeatures {
  const { core, optional } = typeFacets(type, domain)
  const facets = [...core, ...optional]
  const metrics = metricsFor(type, domain)
  const modules = facets
    .map((facet) => MODULE_OF_FACET[facet])
    .filter((module): module is TypeModuleKey => Boolean(module))
  return {
    suggestedModules: [...new Set(modules)],
    metricsMenuLabel: metrics.menuLabel,
    metricsEmptyHint: metrics.emptyHint,
    metricPresets: metrics.presets,
    metricSubject: metrics.subject,
    promoteTreaties: core.includes('treaty'),
    expectStatehood: facets.includes('statehood'),
    expectPower: facets.includes('power') || facets.includes('election'),
    expectOrganizations: facets.includes('organizations'),
  }
}
