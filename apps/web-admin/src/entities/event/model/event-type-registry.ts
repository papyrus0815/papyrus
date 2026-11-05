/**
 * 사건 세부 분야 레지스트리 — **분야의 2단계(분야 › 세부)이자 "이 사건에는 무엇을 기록하는가"의 단일 정본.**
 *
 *  - 분야(Event.domain, 9종·필수): 무엇에 관한 일인가 — 정치·외교·군사·경제… 색·필터의 기준(event-domain.ts).
 *  - 세부(Event.type, 29종·선택): 어떤 꼴의 일인가 — 전투·조약·법령·즉위… 찾아보기의 2단계이고
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
  | 'TERRITORY'
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
 *  territory 영토 이전(어느 땅이 누구에게서 누구에게로)
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
  | 'territory'
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
  territory: '영토 이전',
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
  /** 분야를 안 고른 채 세부부터 골랐을 때 함께 채울 기본 분야 */
  defaultDomain: EventDomainKey
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
    key: 'WAR', short: '전쟁', label: '전쟁', examples: '크림 전쟁 · 30년 전쟁', defaultDomain: 'MILITARY', usuallyCollection: true,
    core: ['sides', 'participants'], optional: ['metrics', 'military', 'treaty', 'persons'],
    metrics: WAR_METRICS,
  },
  BATTLE: {
    key: 'BATTLE', short: '전투', label: '전투·작전', examples: '스당 전투 · 인천상륙작전 · 함락·점령 · 반란 진압', defaultDomain: 'MILITARY',
    core: ['sides', 'participants'], optional: ['metrics', 'military', 'persons'],
    metrics: WAR_METRICS,
  },
  UPRISING: {
    key: 'UPRISING', short: '봉기', label: '봉기·혁명·정변', examples: '우창봉기 · 청년 튀르크 혁명 · 5월정변', defaultDomain: 'POLITICS',
    core: ['sides', 'participants'], optional: ['persons', 'metrics'],
    metrics: SOCIETY_METRICS,
  },
  ATTACK: {
    key: 'ATTACK', short: '암살', label: '암살·테러·학살', examples: '사라예보 암살 · 블랙 홀 사건 · 가스관 폭파', defaultDomain: 'POLITICS',
    core: ['persons', 'participants'], optional: ['metrics'],
    metrics: SOCIETY_METRICS,
  },
  MOBILIZATION: {
    key: 'MOBILIZATION', short: '동원', label: '동원·배치·지령', examples: '총동원령 · 기동훈련 · 함대 정박 · 작전 지령', defaultDomain: 'MILITARY',
    core: ['participants'], optional: ['military', 'metrics', 'persons'],
    metrics: MILITARY_DOMAIN_METRICS,
  },
  // ── 국가 간 ────────────────────────────────────────────────────────────
  TREATY: {
    key: 'TREATY', short: '조약', label: '조약·협정·가입', examples: '난징 조약 · 삼국 동맹 · 철도 차관 협정 · NATO 가입', defaultDomain: 'DIPLOMACY',
    core: ['treaty', 'participants'], optional: ['persons', 'metrics'],
    metrics: TREATY_METRICS,
  },
  SUMMIT: {
    key: 'SUMMIT', short: '회담', label: '회담·회의·교섭', examples: '베를린 회의 · 어전회의 · 공의회 · 협정안 교섭 · 정상 통화', defaultDomain: 'DIPLOMACY',
    core: ['participants', 'persons'], optional: ['treaty'],
  },
  DECLARATION: {
    key: 'DECLARATION', short: '선언', label: '선언·통첩·연설', examples: '선전포고 · 최후통첩 · 중립 선언 · 예산 연설 · 결의', defaultDomain: 'DIPLOMACY',
    core: ['participants'], optional: ['persons', 'treaty'],
  },
  VISIT: {
    key: 'VISIT', short: '방문', label: '방문·사절', examples: '국빈 방문 · 함대 기항 · 사절단 · 흑선 내항', defaultDomain: 'DIPLOMACY',
    core: ['persons', 'participants'], optional: [],
  },
  CRISIS: {
    key: 'CRISIS', short: '위기', label: '위기', examples: '보스니아 위기 · 모로코 위기 · 대동방위기', defaultDomain: 'DIPLOMACY', usuallyCollection: true,
    core: ['participants'], optional: ['sides', 'treaty', 'persons'],
  },
  EXPANSION: {
    key: 'EXPANSION', short: '진출', label: '진출·식민', examples: '동인도회사의 인도 진출 · 3B 정책', defaultDomain: 'DIPLOMACY', usuallyCollection: true,
    core: ['participants'], optional: ['organizations', 'sides', 'treaty'],
  },
  // ── 국가·권력 ──────────────────────────────────────────────────────────
  STATEHOOD: {
    key: 'STATEHOOD', short: '흥망', label: '건국·멸망·독립', examples: '청나라 건국 · 서로마 멸망 · 독립 선언', defaultDomain: 'POLITICS',
    core: ['statehood'], optional: ['persons', 'power', 'territory', 'metrics'],
    metrics: TERRITORY_METRICS,
  },
  /*
   * 영토 변경 — 땅이 한 나라에서 다른 나라로(폴란드 분할·시모노세키 할양·알래스카 매입). 예전엔 '건국·멸망·병합'에 들어가
   * 핵심 기록이 '성립·소멸 국가'였는데, 1차 폴란드 분할에서 연방은 소멸하지 않았다 — 칸이 사건과 맞지 않았다.
   * 나라가 통째로 사라지는 병합은 영토 이전 1줄 + 성립·소멸(멸망 역할)을 함께 쓴다.
   */
  TERRITORY: {
    key: 'TERRITORY', short: '영토', label: '영토 변경(할양·분할·병합)', examples: '폴란드 분할 · 타이완 할양 · 알래스카 매입 · 보스니아 병합', defaultDomain: 'DIPLOMACY',
    core: ['territory', 'participants'], optional: ['treaty', 'statehood', 'persons', 'metrics'],
    metrics: TERRITORY_METRICS,
  },
  POWER_CHANGE: {
    key: 'POWER_CHANGE', short: '권력', label: '즉위·취임·실각', examples: '즉위 · 대통령 취임 · 참모총장 취임 · 해임', defaultDomain: 'POLITICS',
    core: ['power'], optional: ['persons', 'participants'],
  },
  ELECTION: {
    key: 'ELECTION', short: '선거', label: '선거', examples: '총선 · 대통령 선거 · 국왕 선출', defaultDomain: 'POLITICS',
    core: ['election'], optional: ['power', 'participants'],
    metrics: { ...GENERIC_METRICS, presets: ['society.participants'] },
  },
  LAW_POLICY: {
    key: 'LAW_POLICY', short: '법령', label: '법령·정책·개혁', examples: '헌법 공포 · 함대법 · 탄지마트 · 토지 국유화', defaultDomain: 'POLITICS',
    core: ['participants'], optional: ['persons', 'cabinets', 'metrics'],
  },
  INSTITUTION: {
    key: 'INSTITUTION', short: '설립', label: '기관·조직 설립', examples: '참모본부 창설 · 정당 결성 · 은행 개설 · 국회 해산', defaultDomain: 'POLITICS',
    core: ['organizations'], optional: ['participants', 'persons'],
  },
  INCIDENT: {
    key: 'INCIDENT', short: '탄압', label: '탄압·음모·스캔들', examples: '화약 음모 · 안세이 대옥 · 의옥 사건', defaultDomain: 'POLITICS',
    core: ['persons'], optional: ['participants'],
  },
  MOVEMENT: {
    key: 'MOVEMENT', short: '운동', label: '운동·캠페인', examples: '불매운동 · 여론 운동 · 국유화 반대 운동', defaultDomain: 'SOCIETY',
    core: ['participants'], optional: ['persons', 'metrics'],
    metrics: SOCIETY_METRICS,
  },
  // ── 경제·산업 ──────────────────────────────────────────────────────────
  COMPANY: {
    key: 'COMPANY', short: '기업', label: '기업 활동', examples: '설립 · 상장 · 실적 발표 · 인수', defaultDomain: 'ECONOMY',
    core: ['organizations'], optional: ['metrics', 'persons'],
    metrics: ECONOMY_METRICS,
  },
  MARKET: {
    key: 'MARKET', short: '시장', label: '시장·지표', examples: '지수 마감 · 금리 · 차관 · 파동', defaultDomain: 'ECONOMY',
    core: ['metrics'], optional: ['organizations', 'participants'],
    metrics: ECONOMY_METRICS,
  },
  PRODUCT: {
    key: 'PRODUCT', short: '제품', label: '제품·기술 발표', examples: 'ChatGPT 출시 · 칩 아키텍처 공개 · 로켓 퇴역', defaultDomain: 'ECONOMY',
    core: ['organizations'], optional: ['metrics', 'persons'],
    metrics: ECONOMY_METRICS,
  },
  CONSTRUCTION: {
    key: 'CONSTRUCTION', short: '건설', label: '건설·개통', examples: '철도 개통 · 가스관 가동 · 운하 · 전함 진수', defaultDomain: 'ECONOMY',
    core: ['participants'], optional: ['organizations', 'metrics'],
  },
  // ── 자연·학문·문화·사람 ────────────────────────────────────────────────
  DISASTER: {
    key: 'DISASTER', short: '재해', label: '재해·사고', examples: '지진 · 대화재 · 폭발 사고 · 역병', defaultDomain: 'SOCIETY',
    core: ['metrics'], optional: ['participants'],
    metrics: DISASTER_METRICS,
  },
  DISCOVERY: {
    key: 'DISCOVERY', short: '발견', label: '발견·학술', examples: '법칙 발표 · 노벨상 · 발견', defaultDomain: 'SCIENCE',
    core: ['persons'], optional: ['organizations'],
  },
  CREATION: {
    key: 'CREATION', short: '창작', label: '창제·저작·작품', examples: '문자 창제 · 책 출간 · 기념물 제작', defaultDomain: 'CULTURE',
    core: ['persons'], optional: ['participants'],
  },
  CONVERSION: {
    key: 'CONVERSION', short: '개종', label: '개종·세례', examples: '폴란드의 세례 · 기독교 수용', defaultDomain: 'RELIGION',
    core: ['participants'], optional: ['persons'],
  },
  MIGRATION: {
    key: 'MIGRATION', short: '이주', label: '이주·천도', examples: '민족 대이동 · 천도 · 교황청 이전 · 이민선', defaultDomain: 'SOCIETY',
    core: ['participants'], optional: ['metrics'],
    metrics: { ...GENERIC_METRICS, presets: ['demography.population'] },
  },
  PERSONAL: {
    key: 'PERSONAL', short: '행적', label: '인물 행적', examples: '요양·휴가 · 여행 · 건강 이상', defaultDomain: 'POLITICS',
    core: ['persons'], optional: ['participants'],
  },
}

/** 모든 세부 — '더 보기'와 상세 선택지의 순서(충돌 → 국가 간 → 국가·권력 → 경제 → 자연·문화·사람) */
export const EVENT_TYPE_ORDER = Object.keys(EVENT_TYPES) as EventTypeKey[]

export interface EventTypeGroup {
  label: string
  types: EventTypeKey[]
}

/** 세부 의미군 5묶음 — '더 보기'·'기타'·분야 미선택 시 29종을 훑기 쉽게 묶는다 */
export const EVENT_TYPE_GROUPS: ReadonlyArray<EventTypeGroup> = [
  { label: '충돌', types: ['WAR', 'BATTLE', 'UPRISING', 'ATTACK', 'MOBILIZATION'] },
  { label: '국가 간', types: ['TREATY', 'SUMMIT', 'DECLARATION', 'VISIT', 'CRISIS', 'EXPANSION'] },
  { label: '국가·권력', types: ['STATEHOOD', 'TERRITORY', 'POWER_CHANGE', 'ELECTION', 'LAW_POLICY', 'INSTITUTION', 'INCIDENT', 'MOVEMENT'] },
  { label: '경제·산업', types: ['COMPANY', 'MARKET', 'PRODUCT', 'CONSTRUCTION'] },
  { label: '자연·문화·사람', types: ['DISASTER', 'DISCOVERY', 'CREATION', 'CONVERSION', 'MIGRATION', 'PERSONAL'] },
]

/** 분야를 고르기 전에 앞줄로 보여 줄 대표 세부 — 고르면 defaultDomain이 함께 채워진다 */
export const FREQUENT_EVENT_TYPES: EventTypeKey[] = [
  'WAR',
  'BATTLE',
  'TREATY',
  'SUMMIT',
  'STATEHOOD',
  'POWER_CHANGE',
  'LAW_POLICY',
  'UPRISING',
  'COMPANY',
  'DISASTER',
]

/** 주어진 세부 목록을 의미군별로 묶는다(비어 있는 묶음은 뺀다) */
export function groupSubtypes(types: ReadonlyArray<EventTypeKey>): EventTypeGroup[] {
  const allowed = new Set(types)
  return EVENT_TYPE_GROUPS.map((group) => ({
    label: group.label,
    types: group.types.filter((type) => allowed.has(type)),
  })).filter((group) => group.types.length > 0)
}

/**
 * 분야마다 **앞에 보일 세부** — 실데이터에서 그 분야에 실제로 쓰인 세부 + 자연스러운 것.
 * 나머지 세부도 '더 보기'로 고를 수 있다(저장은 독립 축). 기타는 앞줄이 없어 전부 보인다.
 */
export const DOMAIN_SUBTYPES: Partial<Record<EventDomainKey, EventTypeKey[]>> = {
  POLITICS: ['STATEHOOD', 'TERRITORY', 'POWER_CHANGE', 'ELECTION', 'LAW_POLICY', 'INSTITUTION', 'UPRISING', 'INCIDENT', 'ATTACK', 'MOVEMENT', 'DECLARATION', 'PERSONAL'],
  DIPLOMACY: ['TREATY', 'TERRITORY', 'SUMMIT', 'DECLARATION', 'VISIT', 'CRISIS', 'EXPANSION', 'INSTITUTION'],
  MILITARY: ['WAR', 'BATTLE', 'MOBILIZATION', 'LAW_POLICY', 'POWER_CHANGE', 'INSTITUTION', 'UPRISING', 'ATTACK', 'TREATY', 'SUMMIT', 'PERSONAL'],
  ECONOMY: ['COMPANY', 'MARKET', 'PRODUCT', 'CONSTRUCTION', 'LAW_POLICY', 'INSTITUTION', 'TREATY', 'MOVEMENT'],
  SOCIETY: ['UPRISING', 'MOVEMENT', 'DISASTER', 'MIGRATION', 'ATTACK', 'INCIDENT', 'LAW_POLICY', 'INSTITUTION', 'CONSTRUCTION'],
  CULTURE: ['CREATION', 'CONSTRUCTION', 'INSTITUTION', 'DISCOVERY', 'MOVEMENT', 'VISIT'],
  RELIGION: ['CONVERSION', 'SUMMIT', 'LAW_POLICY', 'INSTITUTION', 'MOVEMENT', 'INCIDENT', 'CREATION', 'CONSTRUCTION', 'MIGRATION'],
  SCIENCE: ['DISCOVERY', 'PRODUCT', 'CONSTRUCTION', 'INSTITUTION', 'LAW_POLICY', 'DISASTER'],
}

/**
 * 분야의 앞줄 세부와 나머지 — 분야를 안 골랐거나 앞줄이 없는 분야(기타)는 전부 앞줄.
 * 상위 사건(hasParent)이 정해진 하위 사건 등록에서는 전쟁·위기 같은 묶음 세부를 뒤로 물려
 * 전투·작전 같은 단일 국면 세부가 맨 앞에 오게 한다.
 */
export function subtypesForDomain(
  domain?: string | null,
  options?: { hasParent?: boolean },
): { primary: EventTypeKey[]; rest: EventTypeKey[] } {
  const key = domainKey(domain)
  const rawPrimary = (key ? DOMAIN_SUBTYPES[key] : undefined) ?? EVENT_TYPE_ORDER
  const primary = options?.hasParent
    ? [
        ...rawPrimary.filter((type) => !EVENT_TYPES[type].usuallyCollection),
        ...rawPrimary.filter((type) => EVENT_TYPES[type].usuallyCollection),
      ]
    : rawPrimary
  return { primary, rest: EVENT_TYPE_ORDER.filter((type) => !rawPrimary.includes(type)) }
}

/** 세부의 기본 분야 — 분야를 고르기 전에 세부부터 골랐을 때 함께 채울 분야 */
export function defaultDomainForType(type?: string | null): EventDomainKey | null {
  return eventTypeDef(type)?.defaultDomain ?? null
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
  expectTerritory: boolean
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
    /* 성립·소멸은 핵심일 때만 비어 있어도 세운다 — 영토 변경은 선택이라(1차 분할에서 연방은 소멸하지 않았다) 빈 안내만 섰다 */
    expectStatehood: core.includes('statehood'),
    expectTerritory: facets.includes('territory'),
    expectPower: facets.includes('power') || facets.includes('election'),
    expectOrganizations: facets.includes('organizations'),
  }
}

export interface EventClassificationSuggestion {
  domain: EventDomainKey
  type: EventTypeKey
}

const TITLE_SUGGESTION_RULES: ReadonlyArray<{
  pattern: RegExp
  domain: EventDomainKey
  type: EventTypeKey
}> = [
  // 조약·협정·가입
  {
    pattern: /(?:조약|협정|협약|강화\s*조약|화약|의정서|휴전\s*협정)(?:\s*(?:체결|조인|비준|발효|갱신|폐기))?$/,
    domain: 'DIPLOMACY',
    type: 'TREATY',
  },
  { pattern: /(?:동맹\s*체결|가입)$/, domain: 'DIPLOMACY', type: 'TREATY' },
  // 회담·회의·교섭 (종교 공의회 구분)
  { pattern: /공의회/, domain: 'RELIGION', type: 'SUMMIT' },
  {
    pattern: /(?:정상\s*회담|회담|어전\s*회의|강화\s*회의|평화\s*회의|회의|교섭|회동)$/,
    domain: 'DIPLOMACY',
    type: 'SUMMIT',
  },
  // 기업 합병은 영토가 아니다 — 아래 영토 규칙('합병$')보다 먼저
  { pattern: /(?:회사|기업|은행|그룹|인수)\s*(?:와|과)?\s*.*합병$/, domain: 'ECONOMY', type: 'COMPANY' },
  // 영토 변경 — '병합'은 나라 전체여도 땅이 넘어간 일이라 여기(멸망은 성립·소멸 칸으로 함께)
  {
    pattern: /(?:분할|할양|병합|합병|매입|반환|조차|割讓)$/,
    domain: 'DIPLOMACY',
    type: 'TERRITORY',
  },
  // 건국·멸망·독립
  {
    pattern: /(?:건국|멸망|독립\s*선언|독립|패망|붕괴|해체)$/,
    domain: 'POLITICS',
    type: 'STATEHOOD',
  },
  // 선언·통첩·연설
  {
    pattern: /(?:선전\s*포고|최후\s*통첩|중립\s*선언|연설|담화|성명|통첩|결의)$/,
    domain: 'DIPLOMACY',
    type: 'DECLARATION',
  },
  // 방문·사절
  { pattern: /(?:국빈\s*방문|사절단|내항|기항|예방)$/, domain: 'DIPLOMACY', type: 'VISIT' },
  // 전투·작전
  {
    pattern: /(?:전투|해전|회전|공방전|포위전|상륙\s*작전|작전|공습|폭격|함락|점령|진압)$/,
    domain: 'MILITARY',
    type: 'BATTLE',
  },
  // 전쟁
  { pattern: /(?:전쟁|대전|내전|전역|사변|침공|원정|정벌|정복)$/, domain: 'MILITARY', type: 'WAR' },
  // 동원·배치·지령
  { pattern: /(?:총동원령|동원령|기동\s*훈련|작전\s*지령|계엄령)/, domain: 'MILITARY', type: 'MOBILIZATION' },
  // 봉기·혁명·정변
  {
    pattern: /(?:봉기|혁명|정변|쿠데타|반란|민란|항쟁|의거|폭동|[가-힣]+의\s*난)$/,
    domain: 'POLITICS',
    type: 'UPRISING',
  },
  // 암살·테러·학살
  { pattern: /(?:암살|테러|학살|저격|폭탄\s*투척)/, domain: 'POLITICS', type: 'ATTACK' },
  // 즉위·취임·실각
  {
    pattern: /(?:즉위식|즉위|대관식|취임식|취임|퇴위|선위|폐위|하야|탄핵|해임|실각)$/,
    domain: 'POLITICS',
    type: 'POWER_CHANGE',
  },
  // 선거
  { pattern: /(?:총선|대선|대통령\s*선거|선거|보궐\s*선거|국민\s*투표)$/, domain: 'POLITICS', type: 'ELECTION' },
  // 군사 법령 vs 일반 법령·정책·개혁
  { pattern: /(?:함대법|징병령|군제\s*개편)/, domain: 'MILITARY', type: 'LAW_POLICY' },
  {
    pattern: /(?:헌법|법률|법령|법안|칙령|조례|개혁|신법|[가-힣]{2,}법)(?:\s*(?:제정|공포|시행|발효|개정|폐지|반포|단행))?$/,
    domain: 'POLITICS',
    type: 'LAW_POLICY',
  },
  // 재해·사고
  {
    pattern: /(?:대지진|지진|대화재|화재|홍수|태풍|해일|쓰나미|대기근|기근|역병|전염병|페스트|콜레라|폭발\s*사고|참사|침몰)/,
    domain: 'SOCIETY',
    type: 'DISASTER',
  },
  // 시장·지표 vs 외교 위기
  {
    pattern: /(?:대공황|금융\s*위기|외환\s*위기|주가지수|금리\s*(?:인상|인하)|모라토리엄|디폴트)/,
    domain: 'ECONOMY',
    type: 'MARKET',
  },
  { pattern: /위기$/, domain: 'DIPLOMACY', type: 'CRISIS' },
  // 기업·조직 설립
  { pattern: /(?:회사|기업|은행|그룹|코퍼레이션).*(?:설립|창립|창업|상장|인수)$/, domain: 'ECONOMY', type: 'COMPANY' },
  { pattern: /(?:상장|IPO|인수|실적\s*발표|창업)$/, domain: 'ECONOMY', type: 'COMPANY' },
  { pattern: /(?:창설|결성|개설|해산|설립)$/, domain: 'POLITICS', type: 'INSTITUTION' },
  // 건설·개통 / 제품·기술 발표
  { pattern: /(?:착공|준공|개통|완공|진수)$/, domain: 'ECONOMY', type: 'CONSTRUCTION' },
  { pattern: /(?:출시|공개|발매)$/, domain: 'ECONOMY', type: 'PRODUCT' },
  // 운동·캠페인 / 이주·천도
  {
    pattern: /(?:불매\s*운동|사회\s*운동|계몽\s*운동|노동\s*운동|민권\s*운동|운동|시위|총파업|파업)$/,
    domain: 'SOCIETY',
    type: 'MOVEMENT',
  },
  { pattern: /(?:천도|대이동|이주)$/, domain: 'SOCIETY', type: 'MIGRATION' },
  // 개종·세례 / 창제·저작 / 발견·학술
  { pattern: /(?:개종|세례|국교\s*공인|기독교\s*수용|불교\s*공인)/, domain: 'RELIGION', type: 'CONVERSION' },
  { pattern: /(?:창제|편찬|간행|출간|초연)$/, domain: 'CULTURE', type: 'CREATION' },
  { pattern: /(?:발견|발명|노벨상|법칙\s*발표|학설\s*발표)/, domain: 'SCIENCE', type: 'DISCOVERY' },
]

/**
 * 사건명에서 분야·세부 분야를 추론한다 — '스당 전투', '난징 조약 체결', '우창봉기'처럼
 * 끝말이나 핵심어가 뚜렷할 때만 권하고, 애매하면 null을 돌려준다.
 */
export function suggestClassificationFromTitle(
  rawTitle?: string | null,
): EventClassificationSuggestion | null {
  const cleaned = rawTitle
    ?.trim()
    .replace(/\s*(?:\([^)]*\)|\[[^\]]*\])\s*$/, '')
    .trim()
  if (!cleaned || cleaned.length < 2) return null
  for (const rule of TITLE_SUGGESTION_RULES) {
    if (rule.pattern.test(cleaned)) {
      return { domain: rule.domain, type: rule.type }
    }
  }
  return null
}

/** 세부별 추가 검색 키워드(동의어·연관어) — 빠른 분류 검색에서 예시에 없는 표현도 잡는다 */
const SEARCH_KEYWORDS: Partial<Record<EventTypeKey, string>> = {
  WAR: '대전 내전 전역 사변 침공 원정 정벌 정복',
  BATTLE: '해전 회전 공방전 포위전 상륙작전 공습 폭격 함락 점령 진압 교전',
  UPRISING: '쿠데타 반란 민란 항쟁 의거 폭동 난 봉기 혁명 정변',
  ATTACK: '암살 테러 학살 저격 폭탄 투척 습격',
  MOBILIZATION: '총동원령 동원령 기동훈련 작전지령 계엄령 배치 파병',
  TREATY: '강화조약 화약 의정서 휴전협정 체결 조인 비준 동맹 가입',
  SUMMIT: '정상회담 강화회의 평화회의 어전회의 공의회 교섭 회동',
  DECLARATION: '선전포고 최후통첩 중립선언 담화 성명 통첩 결의 연설',
  VISIT: '국빈방문 사절단 내항 기항 예방 순방',
  CRISIS: '외교위기 사태 분쟁 대치',
  EXPANSION: '식민지 개척 진출 원정대',
  STATEHOOD: '건국 멸망 독립선언 독립 패망 붕괴 해체 왕조',
  TERRITORY: '영토 분할 할양 병합 합병 매입 교환 반환 조차 국경 영토변경 割讓',
  POWER_CHANGE: '즉위식 대관식 취임식 퇴위 선위 폐위 하야 탄핵 해임 실각 계승',
  ELECTION: '총선 대선 대통령선거 보궐선거 국민투표 투표',
  LAW_POLICY: '헌법 법률 법령 법안 칙령 조례 개혁 신법 공포 제정 시행 폐지 함대법 징병령',
  INSTITUTION: '창설 결성 개설 해산 설립 정당 의회 국회 관청',
  INCIDENT: '탄압 음모 스캔들 숙청 옥사 사화 환국 대옥 비리',
  MOVEMENT: '불매운동 사회운동 계몽운동 노동운동 민권운동 독립운동 시위 총파업 파업 캠페인',
  COMPANY: '창업 창립 상장 IPO 인수 합병 파산 실적발표 법인',
  MARKET: '대공황 금융위기 외환위기 주가지수 금리 차관 모라토리엄 디폴트 공황 폭락',
  PRODUCT: '출시 공개 발매 신제품 발명품',
  CONSTRUCTION: '착공 준공 개통 완공 진수 철도 운하 다리 교량 댐',
  DISASTER: '대지진 지진 대화재 화재 홍수 태풍 해일 쓰나미 대기근 기근 역병 전염병 페스트 콜레라 참사 침몰 폭발',
  DISCOVERY: '발견 발명 노벨상 법칙 학설 논문 관측 탐험',
  CREATION: '창제 편찬 간행 출간 초연 저술 작품 건축 예술',
  CONVERSION: '개종 세례 국교 공인 기독교 불교 이슬람 종교',
  MIGRATION: '천도 대이동 이주 이민 망명 유배 피난',
  PERSONAL: '요양 휴가 여행 탄생 사망 별세 서거 유학',
}

export interface ClassificationSearchMatch {
  domain: EventDomainKey
  type: EventTypeKey
  examples: string
}

/**
 * 빠른 분류 검색 — 세부 라벨·두 글자 이름·예시·동의어·분야 이름에서 검색어와 맞는
 * '분야 › 세부' 후보를 추린다. 이미 고른 분야의 앞줄에 속한 세부를 먼저 보여 준다.
 */
export function searchClassifications(
  rawQuery: string,
  currentDomain?: string | null,
): ClassificationSearchMatch[] {
  const query = rawQuery.trim().toLowerCase()
  if (!query) return []
  const activeDomain = domainKey(currentDomain)
  const activePrimary = activeDomain ? (DOMAIN_SUBTYPES[activeDomain] ?? []) : []

  const matches: ClassificationSearchMatch[] = []
  for (const type of EVENT_TYPE_ORDER) {
    const def = EVENT_TYPES[type]
    const targetDomain =
      activeDomain && activePrimary.includes(type) ? activeDomain : def.defaultDomain
    const haystack = [
      def.label,
      def.short,
      def.examples,
      SEARCH_KEYWORDS[type] ?? '',
      domainLabel(targetDomain),
      domainLabel(def.defaultDomain),
    ]
      .join(' ')
      .toLowerCase()
    if (haystack.includes(query)) {
      matches.push({
        domain: targetDomain,
        type,
        examples: def.examples,
      })
    }
  }

  return matches.sort((left, right) => {
    const leftExact = EVENT_TYPES[left.type].label.toLowerCase().includes(query) ? 0 : 1
    const rightExact = EVENT_TYPES[right.type].label.toLowerCase().includes(query) ? 0 : 1
    if (leftExact !== rightExact) return leftExact - rightExact
    const leftInDomain = activePrimary.includes(left.type) ? 0 : 1
    const rightInDomain = activePrimary.includes(right.type) ? 0 : 1
    return leftInDomain - rightInDomain
  })
}

const RECENT_CLASSIFICATIONS_STORAGE_KEY = 'papyrus.eventForm.recentClassifications'
const MAX_RECENT_CLASSIFICATIONS = 4

export interface RecentClassificationCombo {
  domain: EventDomainKey
  type: EventTypeKey | null
}

/** 최근에 저장한 사건의 '분야 › 세부' 조합(최대 4개)을 읽는다 */
export function readRecentClassifications(): RecentClassificationCombo[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(RECENT_CLASSIFICATIONS_STORAGE_KEY)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    const valid: RecentClassificationCombo[] = []
    for (const item of parsed) {
      if (!item || typeof item !== 'object') continue
      const candidate = item as { domain?: unknown; type?: unknown }
      if (!isEventDomainKey(candidate.domain)) continue
      const type =
        candidate.type === null || candidate.type === undefined
          ? null
          : isEventTypeKey(candidate.type)
            ? candidate.type
            : undefined
      if (type === undefined) continue
      valid.push({ domain: candidate.domain, type })
      if (valid.length >= MAX_RECENT_CLASSIFICATIONS) break
    }
    return valid
  } catch {
    return []
  }
}

/** 저장 성공 시 사용한 '분야 › 세부' 조합을 최근 목록 맨 앞에 기록한다 */
export function recordRecentClassification(
  combo: RecentClassificationCombo,
): RecentClassificationCombo[] {
  const current = readRecentClassifications()
  const keyOf = (entry: RecentClassificationCombo) => `${entry.domain}:${entry.type ?? ''}`
  const next = [
    combo,
    ...current.filter((entry) => keyOf(entry) !== keyOf(combo)),
  ].slice(0, MAX_RECENT_CLASSIFICATIONS)
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(RECENT_CLASSIFICATIONS_STORAGE_KEY, JSON.stringify(next))
    } catch {
      /* storage 비활성·용량 초과 시 무시 */
    }
  }
  return next
}


