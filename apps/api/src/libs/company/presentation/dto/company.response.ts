/** 기업 상태 (DTO 검증 @IsIn 용 단일 출처) */
export const COMPANY_STATUS_VALUES = [
  'ACTIVE',
  'DISSOLVED',
  'MERGED',
  'SUSPENDED',
  'OTHER',
] as const

export type CompanyStatusValue = (typeof COMPANY_STATUS_VALUES)[number]

/** 응답에 포함되는 연결 엔티티 요약 (관리 화면 표시용) */
export interface CompanyRelationSummary {
  id: string
  name: string
}

export interface CompanyResponseDto {
  id: string
  /** 회사 이름 */
  name: string
  /** 약칭/티커 (예: EIC, GE) */
  shortName: string | null
  /** 현지어/원어 명칭 */
  localName: string | null
  /** 회사 설명 */
  description: string | null
  /** 상태 */
  status: CompanyStatusValue | null
  /** 설립일 (ISO 8601) */
  foundedAt: string | null
  /** 해산/폐업일 (ISO 8601) */
  dissolvedAt: string | null
  /** 공식 웹사이트 */
  websiteUrl: string | null
  /** 로고 URL */
  logoUrl: string | null
  /** 자유 확장 필드 */
  extra: unknown | null

  //--- 외래키
  founderId: string | null
  countryId: string | null
  historicalCountryId: string | null
  headquartersCityId: string | null
  organizationId: string | null

  //--- 연결 엔티티 요약
  founder: CompanyRelationSummary | null
  country: CompanyRelationSummary | null
  historicalCountry: CompanyRelationSummary | null
  headquartersCity: CompanyRelationSummary | null
  organization: CompanyRelationSummary | null

  createdAt: string
  updatedAt: string
}

/** 시설 유형 */
export type FacilityTypeValue =
  | 'HEADQUARTERS'
  | 'FACTORY'
  | 'RND'
  | 'OFFICE'
  | 'OTHER'

/** 기업 시설 요약 (상세 화면용 — 편집 round-trip 위해 건설 정보·행정구역까지) */
export interface CompanyFacilitySummary {
  id: string
  facilityType: FacilityTypeValue | null
  name: string | null
  address: string | null
  constructionStartDate: string | null
  constructionEndDate: string | null
  constructionBackground: string | null
  openedAt: string | null
  closedAt: string | null
  note: string | null
  city: CompanyRelationSummary | null
  administrativeDivision: CompanyRelationSummary | null
}

/**
 * 연혁 항목 종류 — 응답 타입(CompanyHistoryTypeValue) 파생 전용.
 * 쓰기 검증의 단일 출처는 Prisma enum CompanyHistoryType(@IsEnum, prisma generate 산물)이며
 * 이 배열은 그와 컴파일 링크가 없으므로 enum 추가 시 함께 동기화해야 한다.
 */
export const COMPANY_HISTORY_TYPE_VALUES = [
  'GENERAL',
  'PRODUCT_LAUNCH',
  'FINANCIAL',
  'MERGER_ACQUISITION',
  'LEADERSHIP',
  'LEGAL',
  'MILESTONE',
  'OTHER',
  // 확장(2026-06: 반도체/테크 IR 커버리지) — Prisma enum과 동기화 필수
  'CAPITAL_INVESTMENT',
  'PARTNERSHIP',
  'CAPITAL_POLICY',
  'RESTRUCTURING',
  'REGULATORY',
  'INCIDENT',
] as const

export type CompanyHistoryTypeValue = (typeof COMPANY_HISTORY_TYPE_VALUES)[number]

/** 기업 연혁 항목 (상세 화면용) */
export interface CompanyHistoryItem {
  id: string
  /** 연혁 종류 (제품 발표·재무 등) */
  type: CompanyHistoryTypeValue | null
  title: string
  occurredAt: string | null
  content: string | null
  note: string | null
  /** 당시 주가 */
  stockPrice: number | null
  /** 당시 시가총액 */
  marketCap: number | null
  /** 통화 코드 (예: USD) */
  currency: string | null
  order: number | null
}

/** 기업-카테고리 연결 (상세 화면용) */
export interface CompanyCategoryLink {
  id: string
  categoryId: string
  categoryName: string
  fromDate: string | null
  toDate: string | null
  note: string | null
}

/** 기업 제품 항목 (제품·기술 카탈로그) */
export interface CompanyProductItem {
  id: string
  name: string
  category: string | null
  productLine: string | null
  description: string | null
  announcedAt: string | null
  releasedAt: string | null
  discontinuedAt: string | null
  imageUrl: string | null
  order: number | null
}

/** 기업 주가·재무 시점 (시계열) */
export interface CompanyStockPointItem {
  id: string
  date: string
  price: number | null
  marketCap: number | null
  revenue: number | null
  currency: string | null
  source: string | null
  note: string | null
  marketNote: string | null
}

/** 투자의견 (한국식 5단계) */
export const ANALYST_RATING_VALUES = [
  'STRONG_BUY',
  'BUY',
  'HOLD',
  'SELL',
  'STRONG_SELL',
] as const
export type AnalystRatingValue = (typeof ANALYST_RATING_VALUES)[number]

/** 증권사 목표주가·투자의견 항목 */
export interface CompanyAnalystRatingItem {
  id: string
  firm: string
  analyst: string | null
  targetPrice: number | null
  priorTargetPrice: number | null
  currency: string | null
  rating: AnalystRatingValue | null
  publishedAt: string | null
  reportTitle: string | null
  sourceUrl: string | null
  note: string | null
  order: number | null
}

/** 전망 방향 */
export const OUTLOOK_STANCE_VALUES = ['BULLISH', 'NEUTRAL', 'BEARISH'] as const
export type OutlookStanceValue = (typeof OUTLOOK_STANCE_VALUES)[number]

/** 전망 확신도 */
export const OUTLOOK_CONFIDENCE_VALUES = ['HIGH', 'MEDIUM', 'LOW'] as const
export type OutlookConfidenceValue =
  (typeof OUTLOOK_CONFIDENCE_VALUES)[number]

/** 전망 검증 결과 */
export const OUTLOOK_OUTCOME_VALUES = ['HIT', 'MISS', 'PARTIAL'] as const
export type OutlookOutcomeValue = (typeof OUTLOOK_OUTCOME_VALUES)[number]

/** 시나리오 종류 */
export const SCENARIO_KIND_VALUES = ['BULL', 'BASE', 'BEAR'] as const
export type ScenarioKindValue = (typeof SCENARIO_KIND_VALUES)[number]

/** 밸류에이션 방법 */
export const VALUATION_METHOD_VALUES = [
  'PER',
  'PBR',
  'EV_EBITDA',
  'DCF',
  'SOTP',
  'OTHER',
] as const
export type ValuationMethodValue = (typeof VALUATION_METHOD_VALUES)[number]

/** 핵심 변수 역할 */
export const DRIVER_ROLE_VALUES = ['THESIS', 'RISK'] as const
export type DriverRoleValue = (typeof DRIVER_ROLE_VALUES)[number]

/** 촉매 예정일 신뢰도 */
export const CATALYST_DATE_CONFIDENCE_VALUES = [
  'CONFIRMED',
  'ESTIMATED',
  'TBD',
] as const
export type CatalystDateConfidenceValue =
  (typeof CATALYST_DATE_CONFIDENCE_VALUES)[number]

/** 전망 시나리오 항목 */
export interface CompanyOutlookScenarioItem {
  id: string
  kind: ScenarioKindValue
  targetPrice: number | null
  probability: number | null
  summary: string | null
  order: number | null
}

/** 전망 촉매(예정 이벤트) 항목 */
export interface CompanyOutlookCatalystItem {
  id: string
  title: string
  expectedDate: string | null
  dateConfidence: CatalystDateConfidenceValue | null
  impact: DriverImpactValue | null
  note: string | null
  order: number | null
}

/** 핵심 변수 영향 */
export const DRIVER_IMPACT_VALUES = [
  'POSITIVE',
  'NEGATIVE',
  'NEUTRAL',
] as const
export type DriverImpactValue = (typeof DRIVER_IMPACT_VALUES)[number]

/** 핵심 변수 중요도 */
export const DRIVER_IMPORTANCE_VALUES = ['HIGH', 'MEDIUM', 'LOW'] as const
export type DriverImportanceValue = (typeof DRIVER_IMPORTANCE_VALUES)[number]

/** 전망 핵심 변수 항목 */
export interface CompanyOutlookDriverItem {
  id: string
  name: string
  role: DriverRoleValue | null
  impact: DriverImpactValue | null
  importance: DriverImportanceValue | null
  eventDate: string | null
  note: string | null
  order: number | null
}

/** 향후 전망 항목 (핵심 변수 포함) */
export interface CompanyOutlookItem {
  id: string
  horizon: string | null
  asOf: string | null
  targetDate: string | null
  stance: OutlookStanceValue | null
  confidence: OutlookConfidenceValue | null
  targetPrice: number | null
  priorTargetPrice: number | null
  expectedLow: number | null
  expectedHigh: number | null
  currency: string | null
  rationale: string | null
  source: string | null
  valuationMethod: ValuationMethodValue | null
  targetMultiple: number | null
  perShareBasis: number | null
  basisLabel: string | null
  actualPrice: number | null
  outcome: OutlookOutcomeValue | null
  resolvedAt: string | null
  order: number | null
  drivers: CompanyOutlookDriverItem[]
  scenarios: CompanyOutlookScenarioItem[]
  catalysts: CompanyOutlookCatalystItem[]
}

/** 기업 상세 응답 — 요약 응답 + 시설·연혁·카테고리·제품·주가·목표주가·전망 */
export interface CompanyDetailResponseDto extends CompanyResponseDto {
  /** 재무·주가 분석 코멘터리(리치텍스트 HTML) */
  financialCommentary: string | null
  facilities: CompanyFacilitySummary[]
  histories: CompanyHistoryItem[]
  categories: CompanyCategoryLink[]
  products: CompanyProductItem[]
  stockPoints: CompanyStockPointItem[]
  analystRatings: CompanyAnalystRatingItem[]
  outlooks: CompanyOutlookItem[]
}
