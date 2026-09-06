/**
 * 교역 도메인 직렬화 — Prisma 행 → 응답 DTO.
 *
 * 국가 컨트롤러(`/countries/:id/export-imports`)와 교역 컨트롤러(`/trade/records`)가
 * **같은 모양**을 내려주도록 여기 한 곳에 둔다. 두 곳에서 각자 만들면 화면마다
 * 필드가 있다 없다 하는 옛 문제를 되풀이한다.
 */
import type {
  CommodityTradeFlowRow,
  EraDto,
  ExportImportItemResponse,
  ExportImportResponse,
  TradeCommodityCategoryResponse,
  TradeCommodityResponse,
  TradePartnerKindDto,
  TradeValueScaleDto,
} from '../presentation/dto/trade.dto'

/** Prisma Decimal | string | number | null → number | null */
export function toNumber(value: unknown): number | null {
  if (value == null || value === '') return null
  const numeric = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(numeric) ? numeric : null
}

/** 자릿수 단위 → 곱수. 원자료가 "백만 달러"면 1e6을 곱해야 다른 행과 같이 그릴 수 있다. */
export const VALUE_SCALE_MULTIPLIER: Record<TradeValueScaleDto, number> = {
  ONE: 1,
  THOUSAND: 1e3,
  MILLION: 1e6,
  BILLION: 1e9,
  TRILLION: 1e12,
}

/** BC는 음수 — 정렬·비교는 반드시 이 값으로 한다(절댓값 비교는 기원전을 뒤집는다). */
export function signedYear(era: string | null | undefined, year: number): number {
  return era === 'BC' ? -year : year
}

/** 쉼표로 저장된 별칭 문자열을 배열로. 빈 조각은 버린다. */
export function splitAliases(raw: string | null | undefined): string[] {
  if (!raw) return []
  return raw
    .split(',')
    .map((piece) => piece.trim())
    .filter((piece) => piece.length > 0)
}

/** 이름에서 slug 후보를 만든다. 한글은 그대로 두면 URL에서 못 쓰므로 남는 게 없으면 null. */
export function slugify(name: string): string | null {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  return slug.length > 0 ? slug : null
}

// ── 분류 ─────────────────────────────────────────────────────

export const CATEGORY_INCLUDE = {
  include: {
    parent: { select: { id: true, name: true } },
    _count: { select: { commodities: true } },
  },
} as const

type CategoryRow = {
  id: string
  name: string
  enName: string | null
  slug: string
  parentId: string | null
  parent?: { id: string; name: string } | null
  hsSection: number | null
  description: string | null
  colorKey: string | null
  emoji: string | null
  sortOrder: number
  _count?: { commodities: number }
}

export function serializeCategory(
  row: CategoryRow,
): TradeCommodityCategoryResponse {
  return {
    id: row.id,
    name: row.name,
    enName: row.enName,
    slug: row.slug,
    parentId: row.parentId,
    parentName: row.parent?.name ?? null,
    hsSection: row.hsSection,
    description: row.description,
    colorKey: row.colorKey,
    emoji: row.emoji,
    sortOrder: row.sortOrder,
    commodityCount: row._count?.commodities ?? 0,
  }
}

// ── 품목 ─────────────────────────────────────────────────────

export const COMMODITY_INCLUDE = {
  include: {
    category: {
      include: { parent: { select: { name: true } } },
    },
    _count: { select: { flows: true } },
  },
} as const

type CommodityRow = {
  id: string
  name: string
  enName: string | null
  slug: string | null
  aliases: string | null
  categoryId: string
  category?: {
    name: string
    colorKey: string | null
    emoji: string | null
    parent?: { name: string } | null
  } | null
  hsCode: string | null
  sitcCode: string | null
  defaultUnit: string | null
  firstYearSigned: number | null
  lastYearSigned: number | null
  isService: boolean
  description: string | null
  thumbnailUrl: string | null
  sortOrder: number
  accountId: string | null
  _count?: { flows: number }
}

export function serializeCommodity(row: CommodityRow): TradeCommodityResponse {
  const categoryName = row.category?.name ?? ''
  const parentName = row.category?.parent?.name ?? null
  return {
    id: row.id,
    name: row.name,
    enName: row.enName,
    slug: row.slug,
    aliases: splitAliases(row.aliases),
    categoryId: row.categoryId,
    categoryName,
    categoryPath: parentName ? `${parentName} › ${categoryName}` : categoryName,
    categoryColorKey: row.category?.colorKey ?? null,
    categoryEmoji: row.category?.emoji ?? null,
    hsCode: row.hsCode,
    sitcCode: row.sitcCode,
    defaultUnit: row.defaultUnit,
    firstYearSigned: row.firstYearSigned,
    lastYearSigned: row.lastYearSigned,
    isService: row.isService,
    description: row.description,
    thumbnailUrl: row.thumbnailUrl,
    sortOrder: row.sortOrder,
    accountId: row.accountId,
    usageCount: row._count?.flows ?? 0,
  }
}

// ── 교역 흐름 ────────────────────────────────────────────────

/** 흐름은 방향 → 순서 → 이름으로 세운다. 이름들은 함께 내려 프론트 왕복을 줄인다. */
export const FLOW_INCLUDE = {
  include: {
    commodity: {
      select: {
        id: true,
        name: true,
        defaultUnit: true,
        categoryId: true,
        category: {
          select: {
            id: true,
            name: true,
            colorKey: true,
            emoji: true,
            parent: { select: { id: true, name: true, colorKey: true } },
          },
        },
      },
    },
    category: {
      select: {
        id: true,
        name: true,
        colorKey: true,
        emoji: true,
        parent: { select: { id: true, name: true, colorKey: true } },
      },
    },
    partnerCountry: { select: { name: true } },
    partnerHistoricalCountry: { select: { name: true } },
    partnerOrganization: { select: { name: true } },
    relatedEvent: { select: { title: true } },
    relatedTreaty: { select: { name: true } },
    relatedCompany: { select: { organization: { select: { name: true } } } },
  },
  orderBy: [
    { direction: 'asc' as const },
    { sortOrder: 'asc' as const },
    { name: 'asc' as const },
  ],
}

type CategoryRefRow = {
  id: string
  name: string
  colorKey: string | null
  emoji: string | null
  parent?: { id: string; name: string; colorKey: string | null } | null
} | null

export type FlowRow = {
  id: string
  direction: string
  grain: string
  commodityId: string | null
  commodity?: {
    id: string
    name: string
    defaultUnit: string | null
    categoryId: string
    category?: CategoryRefRow
  } | null
  name: string
  categoryId: string | null
  category?: CategoryRefRow
  hsCode: string | null
  partnerCountryId: string | null
  partnerCountry?: { name: string } | null
  partnerHistoricalCountryId: string | null
  partnerHistoricalCountry?: { name: string } | null
  partnerOrganizationId: string | null
  partnerOrganization?: { name: string } | null
  partnerLabel: string | null
  value: unknown
  sharePct: unknown
  quantity: unknown
  quantityUnit: string | null
  unitPrice: unknown
  priceBasis: string | null
  rankInDirection: number | null
  yoyPct: unknown
  channel: string | null
  restriction: string | null
  tariffRatePct: unknown
  isReExport: boolean
  transportMode: string | null
  routeName: string | null
  portName: string | null
  relatedEventId: string | null
  relatedEvent?: { title: string } | null
  relatedTreatyId: string | null
  relatedTreaty?: { name: string } | null
  relatedCompanyId: string | null
  relatedCompany?: { organization?: { name: string } | null } | null
  isEstimate: boolean
  sourceNote: string | null
  notes: string | null
  sortOrder: number
}

/**
 * 상대는 네 자리(현대국가·역사국가·조직·자유표기) 중 채워진 것으로 읽는다.
 * 우선순위를 고정해 두 곳이 차 있어도 화면마다 다른 이름이 뜨지 않게 한다.
 */
export function resolvePartner(row: FlowRow): {
  partnerName: string | null
  partnerKind: TradePartnerKindDto
} {
  if (row.partnerCountryId) {
    return {
      partnerName: row.partnerCountry?.name ?? null,
      partnerKind: 'COUNTRY',
    }
  }
  if (row.partnerHistoricalCountryId) {
    return {
      partnerName: row.partnerHistoricalCountry?.name ?? null,
      partnerKind: 'HISTORICAL_COUNTRY',
    }
  }
  if (row.partnerOrganizationId) {
    return {
      partnerName: row.partnerOrganization?.name ?? null,
      partnerKind: 'ORGANIZATION',
    }
  }
  if (row.partnerLabel) {
    return { partnerName: row.partnerLabel, partnerKind: 'LABEL' }
  }
  return { partnerName: null, partnerKind: 'NONE' }
}

/** 분류는 행에 직접 걸린 것이 먼저, 없으면 품목에서 파생. */
function resolveFlowCategory(row: FlowRow): CategoryRefRow {
  return row.category ?? row.commodity?.category ?? null
}

export function serializeFlow(
  row: FlowRow,
  scaleMultiplier: number,
): ExportImportItemResponse {
  const value = toNumber(row.value)
  const category = resolveFlowCategory(row)
  const partner = resolvePartner(row)
  return {
    id: row.id,
    direction: row.direction as 'EXPORT' | 'IMPORT',
    grain: row.grain as ExportImportItemResponse['grain'],

    commodityId: row.commodityId,
    name: row.name,
    categoryId: row.categoryId ?? category?.id ?? null,
    categoryName: category?.name ?? null,
    categoryColorKey: category?.colorKey ?? null,
    categoryEmoji: category?.emoji ?? null,
    /*
     * 대분류도 함께 내린다. 중분류는 대분류 색을 물려받아 형제끼리 색이 겹치므로
     * (자동차·선박이 둘 다 '운송장비' 색), 구성 막대는 대분류로 묶어야 읽힌다.
     * 대분류가 없는 분류(자기 자신이 대분류)는 자기를 가리킨다.
     */
    rootCategoryId: category ? (category.parent?.id ?? category.id) : null,
    rootCategoryName: category
      ? (category.parent?.name ?? category.name)
      : null,
    rootCategoryColorKey: category
      ? (category.parent?.colorKey ?? category.colorKey)
      : null,
    hsCode: row.hsCode,

    partnerCountryId: row.partnerCountryId,
    partnerHistoricalCountryId: row.partnerHistoricalCountryId,
    partnerOrganizationId: row.partnerOrganizationId,
    partnerLabel: row.partnerLabel,
    partnerName: partner.partnerName,
    partnerKind: partner.partnerKind,

    value,
    valueNormalized: value == null ? null : value * scaleMultiplier,
    sharePct: toNumber(row.sharePct),
    quantity: toNumber(row.quantity),
    /*
     * 카탈로그의 기본 단위로 메우지 않는다 — 자료에 없던 '톤'이 응답에 섞이면
     * 폼이 그걸 하이드레이션했다가 그대로 저장해, 출처에 없는 단위가 기록으로 굳는다.
     * 기본 단위는 새 행을 고를 때 폼이 채워 넣는 몫이다.
     */
    quantityUnit: row.quantityUnit,
    unitPrice: toNumber(row.unitPrice),
    priceBasis: row.priceBasis as ExportImportItemResponse['priceBasis'],
    rankInDirection: row.rankInDirection,
    yoyPct: toNumber(row.yoyPct),

    channel: row.channel as ExportImportItemResponse['channel'],
    restriction: row.restriction as ExportImportItemResponse['restriction'],
    tariffRatePct: toNumber(row.tariffRatePct),
    isReExport: row.isReExport,
    transportMode: row.transportMode as ExportImportItemResponse['transportMode'],
    routeName: row.routeName,
    portName: row.portName,

    relatedEventId: row.relatedEventId,
    relatedEventTitle: row.relatedEvent?.title ?? null,
    relatedTreatyId: row.relatedTreatyId,
    relatedTreatyName: row.relatedTreaty?.name ?? null,
    relatedCompanyId: row.relatedCompanyId,
    relatedCompanyName: row.relatedCompany?.organization?.name ?? null,

    isEstimate: row.isEstimate,
    sourceNote: row.sourceNote,
    notes: row.notes,
    sortOrder: row.sortOrder,
  }
}

// ── 연도 헤더 ────────────────────────────────────────────────

export const RECORD_INCLUDE = {
  country: { select: { name: true } },
  historicalCountry: { select: { name: true } },
  items: FLOW_INCLUDE,
} as const

export type RecordRow = {
  id: string
  countryId: string | null
  country?: { name: string } | null
  historicalCountryId: string | null
  historicalCountry?: { name: string } | null
  era: string
  year: number
  periodEndYear: number | null
  aggregation: string
  exportValue: unknown
  importValue: unknown
  currencyCode: string | null
  valueScale: string
  priceNote: string | null
  priceBasis: string | null
  sourceName: string | null
  sourceUrl: string | null
  isEstimate: boolean
  confidence: string | null
  note: string | null
  items?: FlowRow[]
  createdAt: Date
  updatedAt: Date
}

export function serializeRecord(row: RecordRow): ExportImportResponse {
  const scale = row.valueScale as TradeValueScaleDto
  const multiplier = VALUE_SCALE_MULTIPLIER[scale] ?? 1
  const exportValue = toNumber(row.exportValue)
  const importValue = toNumber(row.importValue)
  return {
    id: row.id,
    countryId: row.countryId,
    countryName: row.country?.name ?? null,
    historicalCountryId: row.historicalCountryId,
    historicalCountryName: row.historicalCountry?.name ?? null,
    era: row.era as EraDto,
    year: row.year,
    signedYear: signedYear(row.era, row.year),
    periodEndYear: row.periodEndYear,
    aggregation: row.aggregation as ExportImportResponse['aggregation'],
    exportValue,
    importValue,
    exportValueNormalized: exportValue == null ? null : exportValue * multiplier,
    importValueNormalized: importValue == null ? null : importValue * multiplier,
    currencyCode: row.currencyCode,
    valueScale: scale,
    priceNote: row.priceNote,
    priceBasis: row.priceBasis as ExportImportResponse['priceBasis'],
    sourceName: row.sourceName,
    sourceUrl: row.sourceUrl,
    isEstimate: row.isEstimate,
    confidence: row.confidence as ExportImportResponse['confidence'],
    note: row.note,
    items: (row.items ?? []).map((item) => serializeFlow(item, multiplier)),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  }
}

// ── 교차 조회 ────────────────────────────────────────────────

export function serializeCommodityFlowRow(
  flow: FlowRow & { exportImport: RecordRow },
): CommodityTradeFlowRow {
  const header = flow.exportImport
  const multiplier =
    VALUE_SCALE_MULTIPLIER[header.valueScale as TradeValueScaleDto] ?? 1
  const value = toNumber(flow.value)
  const partner = resolvePartner(flow)
  const isModern = header.countryId != null
  return {
    flowId: flow.id,
    direction: flow.direction as 'EXPORT' | 'IMPORT',
    era: header.era as EraDto,
    year: header.year,
    signedYear: signedYear(header.era, header.year),
    reporterId: isModern ? header.countryId : header.historicalCountryId,
    reporterName: isModern
      ? (header.country?.name ?? null)
      : (header.historicalCountry?.name ?? null),
    reporterKind: isModern ? 'COUNTRY' : 'HISTORICAL_COUNTRY',
    partnerName: partner.partnerName,
    partnerKind: partner.partnerKind,
    value,
    valueNormalized: value == null ? null : value * multiplier,
    currencyCode: header.currencyCode,
    sharePct: toNumber(flow.sharePct),
    quantity: toNumber(flow.quantity),
    quantityUnit: flow.quantityUnit,
    channel: flow.channel as CommodityTradeFlowRow['channel'],
    isEstimate: flow.isEstimate,
  }
}
