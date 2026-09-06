/**
 * 교역(Trade) 도메인 DTO.
 *
 * 세 겹이다 — 품목 카탈로그(분류·품목), 연도 헤더(총액·통화·출처), 교역 흐름(무엇을·누구와).
 * 자세한 배경은 `libs/db/prisma/trade.prisma` 머리말 참고.
 */

export type TradeDirectionDto = 'EXPORT' | 'IMPORT'

/** 흐름 행의 단면 — 단면이 다른 행끼리 더하면 이중계산이다. */
export type TradeFlowGrainDto = 'COMMODITY' | 'PARTNER' | 'PARTNER_COMMODITY'

export type TradePriceBasisDto = 'FOB' | 'CIF' | 'FRONTIER' | 'UNKNOWN'

export type TradeValueScaleDto =
  | 'ONE'
  | 'THOUSAND'
  | 'MILLION'
  | 'BILLION'
  | 'TRILLION'

export type TradePeriodAggregationDto = 'ANNUAL' | 'AVERAGE' | 'TOTAL'

export type TradeDataConfidenceDto = 'HIGH' | 'MEDIUM' | 'LOW'

export type TradeChannelDto =
  | 'OFFICIAL'
  | 'TRIBUTE'
  | 'PRIVATE'
  | 'SMUGGLING'
  | 'CONCESSION'
  | 'CHARTERED_COMPANY'
  | 'STATE_MONOPOLY'
  | 'AID'
  | 'BARTER'

export type TradeRestrictionKindDto =
  | 'NONE'
  | 'EMBARGO'
  | 'SANCTION'
  | 'QUOTA'
  | 'PROHIBITED'
  | 'LICENSED'
  | 'PROTECTIVE_TARIFF'
  | 'ANTIDUMPING'

export type TradeTransportModeDto =
  | 'SEA'
  | 'RIVER'
  | 'LAND'
  | 'CARAVAN'
  | 'RAIL'
  | 'AIR'
  | 'PIPELINE'
  | 'CABLE'
  | 'UNKNOWN'

export type EraDto = 'BC' | 'AD'

// ── 품목 분류 ────────────────────────────────────────────────

export interface TradeCommodityCategoryResponse {
  id: string
  name: string
  enName: string | null
  slug: string
  parentId: string | null
  /** 상위 분류명 — 목록에서 "운송장비 › 자동차"로 읽히게 함께 내려준다 */
  parentName: string | null
  hsSection: number | null
  description: string | null
  colorKey: string | null
  emoji: string | null
  sortOrder: number
  /** 이 분류(하위 포함 아님)에 직접 속한 품목 수 */
  commodityCount: number
}

export interface UpsertTradeCommodityCategoryDto {
  name: string
  enName?: string | null
  /** 없으면 서버가 name에서 만든다 */
  slug?: string | null
  parentId?: string | null
  hsSection?: number | null
  description?: string | null
  colorKey?: string | null
  emoji?: string | null
  sortOrder?: number | null
}

// ── 품목 ─────────────────────────────────────────────────────

export interface TradeCommodityResponse {
  id: string
  name: string
  enName: string | null
  slug: string | null
  /** 쉼표로 이어 붙인 원본 문자열이 아니라 잘라 놓은 배열로 내려준다 */
  aliases: string[]
  categoryId: string
  categoryName: string
  categoryPath: string
  categoryColorKey: string | null
  categoryEmoji: string | null
  hsCode: string | null
  sitcCode: string | null
  defaultUnit: string | null
  /** 부호 있는 연도 — 음수는 기원전 */
  firstYearSigned: number | null
  lastYearSigned: number | null
  isService: boolean
  description: string | null
  thumbnailUrl: string | null
  sortOrder: number
  accountId: string | null
  /** 이 품목이 실제 교역 기록에 쓰인 횟수 — 목록 정렬·삭제 판단에 쓴다 */
  usageCount: number
}

export interface UpsertTradeCommodityDto {
  name: string
  enName?: string | null
  slug?: string | null
  /** 배열로 받아 서버가 쉼표 문자열로 저장한다 */
  aliases?: string[] | null
  categoryId: string
  hsCode?: string | null
  sitcCode?: string | null
  defaultUnit?: string | null
  firstYearSigned?: number | null
  lastYearSigned?: number | null
  isService?: boolean | null
  description?: string | null
  thumbnailUrl?: string | null
  sortOrder?: number | null
}

// ── 교역 흐름 ────────────────────────────────────────────────

/** 교역 상대가 무엇으로 지목됐는지 */
export type TradePartnerKindDto =
  | 'COUNTRY'
  | 'HISTORICAL_COUNTRY'
  | 'ORGANIZATION'
  | 'LABEL'
  | 'NONE'

export interface ExportImportItemResponse {
  id: string
  direction: TradeDirectionDto
  grain: TradeFlowGrainDto

  //--- 무엇을
  commodityId: string | null
  name: string
  categoryId: string | null
  /** 분류는 행에 직접 걸렸거나 품목에서 파생된다 — 프론트가 두 곳을 보지 않도록 합쳐서 내려준다 */
  categoryName: string | null
  categoryColorKey: string | null
  categoryEmoji: string | null
  hsCode: string | null

  //--- 누구와
  partnerCountryId: string | null
  partnerHistoricalCountryId: string | null
  partnerOrganizationId: string | null
  partnerLabel: string | null
  /** 넷 중 채워진 것에서 뽑은 표시용 이름 */
  partnerName: string | null
  partnerKind: TradePartnerKindDto

  //--- 얼마나
  value: number | null
  /** 헤더의 자릿수 단위를 곱해 절대 금액으로 환산한 값 — 서로 다른 행을 같이 그릴 때 쓴다 */
  valueNormalized: number | null
  sharePct: number | null
  quantity: number | null
  quantityUnit: string | null
  unitPrice: number | null
  priceBasis: TradePriceBasisDto | null
  rankInDirection: number | null
  yoyPct: number | null

  //--- 어떻게
  channel: TradeChannelDto | null
  restriction: TradeRestrictionKindDto | null
  tariffRatePct: number | null
  isReExport: boolean
  transportMode: TradeTransportModeDto | null
  routeName: string | null
  portName: string | null

  //--- 왜
  relatedEventId: string | null
  relatedEventTitle: string | null
  relatedTreatyId: string | null
  relatedTreatyName: string | null
  relatedCompanyId: string | null
  relatedCompanyName: string | null

  //--- 자료
  isEstimate: boolean
  sourceNote: string | null
  notes: string | null
  sortOrder: number
}

export interface ExportImportResponse {
  id: string
  countryId: string | null
  countryName: string | null
  historicalCountryId: string | null
  historicalCountryName: string | null
  era: EraDto
  year: number
  /** 정렬·비교용 부호 연도 (BC는 음수) */
  signedYear: number
  periodEndYear: number | null
  aggregation: TradePeriodAggregationDto
  exportValue: number | null
  importValue: number | null
  /** 자릿수 단위를 곱한 절대 금액 */
  exportValueNormalized: number | null
  importValueNormalized: number | null
  currencyCode: string | null
  valueScale: TradeValueScaleDto
  priceNote: string | null
  priceBasis: TradePriceBasisDto | null
  sourceName: string | null
  sourceUrl: string | null
  isEstimate: boolean
  confidence: TradeDataConfidenceDto | null
  note: string | null
  items: ExportImportItemResponse[]
  createdAt: string
  updatedAt: string
}

/** 흐름 입력 — 자식 id는 클라이언트가 들고 다니지 않는다(배열 통째 교체). */
export interface UpsertExportImportItemDto {
  direction: TradeDirectionDto
  grain?: TradeFlowGrainDto | null

  commodityId?: string | null
  /** 비워두면 서버가 카탈로그 품목명으로 채운다 */
  name?: string | null
  categoryId?: string | null
  hsCode?: string | null

  partnerCountryId?: string | null
  partnerHistoricalCountryId?: string | null
  partnerOrganizationId?: string | null
  partnerLabel?: string | null

  value?: number | null
  sharePct?: number | null
  quantity?: number | null
  quantityUnit?: string | null
  unitPrice?: number | null
  priceBasis?: TradePriceBasisDto | null
  rankInDirection?: number | null
  yoyPct?: number | null

  channel?: TradeChannelDto | null
  restriction?: TradeRestrictionKindDto | null
  tariffRatePct?: number | null
  isReExport?: boolean | null
  transportMode?: TradeTransportModeDto | null
  routeName?: string | null
  portName?: string | null

  relatedEventId?: string | null
  relatedTreatyId?: string | null
  relatedCompanyId?: string | null

  isEstimate?: boolean | null
  sourceNote?: string | null
  notes?: string | null
  sortOrder?: number | null
}

/** 주체(현대/역사 국가) + era + year 기준 upsert 입력. */
export interface UpsertExportImportDto {
  era?: EraDto | null
  year: number
  periodEndYear?: number | null
  aggregation?: TradePeriodAggregationDto | null
  exportValue?: number | null
  importValue?: number | null
  currencyCode?: string | null
  valueScale?: TradeValueScaleDto | null
  priceNote?: string | null
  priceBasis?: TradePriceBasisDto | null
  sourceName?: string | null
  sourceUrl?: string | null
  isEstimate?: boolean | null
  confidence?: TradeDataConfidenceDto | null
  note?: string | null
  /**
   * 흐름 배열. **주면 그 해 흐름 전체를 이 배열로 교체**하고(delete-and-recreate),
   * 주지 않으면(undefined) 기존 흐름을 건드리지 않는다 — 총액만 고치는 호출이
   * 품목을 조용히 날리면 안 되기 때문이다. 빈 배열은 '전부 지우기'다.
   */
  items?: UpsertExportImportItemDto[]
}

/** 주체를 몸통에 실어 보내는 형태 (현대·역사 국가 공용 엔드포인트) */
export interface UpsertTradeRecordDto extends UpsertExportImportDto {
  countryId?: string | null
  historicalCountryId?: string | null
}

// ── 교차 조회 ────────────────────────────────────────────────

/**
 * "이 품목을 누가 주고받았나" — 카탈로그가 있어야 물을 수 있는 질문.
 * 품목을 문자열로만 적었다면 나라마다 표기가 갈려 이 조회 자체가 성립하지 않는다.
 */
export interface CommodityTradeFlowRow {
  flowId: string
  direction: TradeDirectionDto
  era: EraDto
  year: number
  signedYear: number
  /** 이 흐름을 신고한 쪽 */
  reporterId: string | null
  reporterName: string | null
  reporterKind: 'COUNTRY' | 'HISTORICAL_COUNTRY'
  partnerName: string | null
  partnerKind: TradePartnerKindDto
  value: number | null
  valueNormalized: number | null
  currencyCode: string | null
  sharePct: number | null
  quantity: number | null
  quantityUnit: string | null
  channel: TradeChannelDto | null
  isEstimate: boolean
}
