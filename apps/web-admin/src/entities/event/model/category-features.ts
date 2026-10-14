/**
 * 사건 카테고리 → 상세 지면 기능 레지스트리 (단일 출처).
 *
 * 사건 상세는 카테고리를 색·아이콘으로만 썼다. 그래서 모듈 추가 메뉴는 모든 사건에 같은 목록을
 * 같은 순서로 띄웠고, 수치 모듈은 경제·조약 사건에서도 "병력·사상자·비용"을 권했다
 * (docs/event-category-features-review.md §1.1).
 *
 * ⚠️ 이 표는 **추천만** 정한다 — 기능을 카테고리에 묶지 않는다. 봉기(사회)에도 진영을, 전쟁에도
 * 조약을 달 수 있어야 한다(검토서 원칙 1). 여기 없는 모듈도 메뉴의 '다른 기능'에 그대로 남는다.
 *
 * 카테고리 이름이 아니라 `LEDGER_CATEGORY`의 key로 매핑한다 — 이름(한글)이 바뀌어도 이 표는 안 깨진다.
 */
import { type LedgerCategory, resolveCategory } from '../ui/ledger-tokens'

/** 상세 지면에서 '모듈 추가'로 켤 수 있는 모듈. 페이지 쪽 EventDetailModuleKey의 부분집합. */
export type CategoryModuleKey = 'sides' | 'metrics' | 'military-details'

/** 수치 입력 시 처음 고를 대상 — 진영이 있으면 진영, 아니면 사건 전체. */
export type MetricSubjectPreference = 'side' | 'event'

export interface CategoryFeatures {
  /** 모듈 추가 메뉴 맨 위 '이 분류에 맞는 기능' — 순서가 곧 추천 순위 */
  suggestedModules: CategoryModuleKey[]
  /** 모듈 추가 메뉴의 수치 항목 라벨 */
  metricsMenuLabel: string
  /** 수치가 하나도 없을 때 모듈 안내문 */
  metricsEmptyHint: string
  /**
   * 지표 선택 상자 맨 위 '자주 쓰는 지표' — metric_definition.key.
   * DB에 없는 키는 조용히 건너뛴다(지표 카탈로그는 데이터라 환경마다 다를 수 있다).
   */
  metricPresets: string[]
  metricSubject: MetricSubjectPreference
  /**
   * 조약 섹션을 본문 바로 뒤로 올리고, 비어 있어도 접지 않는다.
   * 회담/조약 사건에서 조약은 부록이 아니라 그 사건의 결과물이다(검토서 §3 회담/조약).
   */
  promoteTreaties: boolean
  /**
   * 「국가 성립·소멸」 섹션을 역할(건국·멸망)이 없어도 띄워 지정을 안내한다.
   * 역할이 있으면 카테고리와 무관하게 늘 보인다 — 이 값은 '비어 있을 때'만 가른다.
   */
  expectStatehood: boolean
  /** 「권력 교체·선거」 섹션을 비어 있어도 띄워 연결을 안내한다(데이터가 있으면 늘 보인다) */
  expectPower: boolean
  /** 「관련 기업·조직」 섹션을 비어 있어도 띄워 연결을 안내한다(데이터가 있으면 늘 보인다) */
  expectOrganizations: boolean
}

const GENERIC: CategoryFeatures = {
  suggestedModules: [],
  metricsMenuLabel: '수치',
  metricsEmptyHint: '이 사건의 숫자를 출처와 함께 기록하면 여기 모입니다.',
  metricPresets: [],
  metricSubject: 'event',
  promoteTreaties: false,
  expectStatehood: false,
  expectPower: false,
  expectOrganizations: false,
}

/**
 * key = LEDGER_CATEGORY[*].key.
 *
 * 사건 단위 수치(대상 '사건 전체')는 경제·사회·조약·건국에서 기본으로 둔다. 전쟁은 진영별 값이
 * 정본이라 진영을 먼저 고른다 — 사건 합계와 진영별 값을 이중으로 적는 일을 줄인다(검토서 §5-3).
 */
const FEATURES_BY_KEY: Partial<Record<LedgerCategory['key'], CategoryFeatures>> = {
  war: {
    suggestedModules: ['sides', 'metrics', 'military-details'],
    metricsMenuLabel: '수치 (병력·사상자·비용)',
    metricsEmptyHint: '병력·사상자·비용 같은 숫자를 출처와 함께 기록하면 진영별 비교가 여기 그려집니다.',
    metricPresets: [
      'military.personnel',
      'military.killed_in_action',
      'military.wounded',
      'military.casualties_total',
      'civilian.killed',
      'economy.war_expenditure',
    ],
    metricSubject: 'side',
    promoteTreaties: false,
    expectStatehood: false,
    expectPower: false,
    expectOrganizations: false,
  },
  treaty: {
    suggestedModules: ['metrics'],
    metricsMenuLabel: '수치 (배상금·할양 면적)',
    metricsEmptyHint: '배상금·할양 면적처럼 조약이 정한 숫자를 출처와 함께 기록하면 여기 모입니다.',
    metricPresets: ['economy.indemnity', 'territory.area_ceded', 'demography.population'],
    metricSubject: 'event',
    promoteTreaties: true,
    expectStatehood: false,
    expectPower: false,
    expectOrganizations: false,
  },
  economy: {
    suggestedModules: ['metrics'],
    metricsMenuLabel: '수치 (지수·시가총액·금리)',
    metricsEmptyHint: '지수 종가·수익률·시가총액·금리 같은 숫자를 출처와 함께 기록하면 여기 모입니다.',
    metricPresets: [
      'economy.index_close',
      'economy.return_rate',
      'economy.market_cap',
      'economy.interest_rate',
      'economy.capital',
      'economy.loss',
    ],
    metricSubject: 'event',
    promoteTreaties: false,
    expectStatehood: false,
    expectPower: false,
    expectOrganizations: true,
  },
  social: {
    /* 봉기·혁명이 많아(사회 28건 중 ADVERSARY 역할 6) 진영도 함께 권한다 */
    suggestedModules: ['metrics', 'sides'],
    metricsMenuLabel: '수치 (참여 인원·피해·재해 규모)',
    metricsEmptyHint: '참여 인원이나 사망·부상·이재민 같은 피해 규모를 출처와 함께 기록하면 여기 모입니다.',
    metricPresets: [
      'society.participants',
      'human.deaths_total',
      'civilian.killed',
      'civilian.wounded',
      'civilian.displaced',
      'disaster.magnitude',
      'disaster.buildings_destroyed',
      'economy.loss',
    ],
    metricSubject: 'event',
    promoteTreaties: false,
    expectStatehood: false,
    expectPower: false,
    expectOrganizations: false,
  },
  statehood: {
    suggestedModules: ['metrics'],
    metricsMenuLabel: '수치 (인구·영토)',
    metricsEmptyHint: '성립·소멸 당시의 인구나 영토 같은 숫자를 출처와 함께 기록하면 여기 모입니다.',
    metricPresets: ['demography.population', 'territory.area_ceded'],
    metricSubject: 'event',
    promoteTreaties: false,
    expectStatehood: true,
    expectPower: false,
    expectOrganizations: false,
  },
  politics: {
    suggestedModules: [],
    metricsMenuLabel: '수치 (참여 인원 등)',
    metricsEmptyHint: '참여 인원 같은 숫자를 출처와 함께 기록하면 여기 모입니다.',
    metricPresets: ['society.participants', 'demography.population'],
    metricSubject: 'event',
    promoteTreaties: false,
    expectStatehood: false,
    expectPower: true,
    expectOrganizations: false,
  },
}

/** 카테고리 이름(응답의 category.name) → 기능 표. 미분류·미등록은 범용 표. */
export function categoryFeatures(categoryName?: string | null): CategoryFeatures {
  return FEATURES_BY_KEY[resolveCategory(categoryName).key] ?? GENERIC
}
