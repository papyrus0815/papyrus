/**
 * 교역 쓰기 경로 공용 유틸 — 입력 DTO를 Prisma create 데이터로 옮긴다.
 *
 * 국가 컨트롤러와 교역 컨트롤러가 같은 규칙으로 저장하도록 여기 한 곳에 둔다.
 */
import { BadRequestException } from '@nestjs/common'

import type {
  UpsertExportImportDto,
  UpsertExportImportItemDto,
} from '../presentation/dto/trade.dto'

/** 흐름 한 줄에 걸린 상대 FK 개수 (자유 표기는 세지 않는다) */
function partnerRefCount(item: UpsertExportImportItemDto): number {
  return [
    item.partnerCountryId,
    item.partnerHistoricalCountryId,
    item.partnerOrganizationId,
  ].filter((ref) => ref != null && ref !== '').length
}

/**
 * 단면(grain)을 안 적어 보냈으면 채워진 칸으로 추론한다.
 *
 * 단면은 합계 이중계산을 막는 유일한 표식이라 비워둘 수 없다. 그렇다고 매번
 * 고르게 하면 폼이 무거워져, 상대·품목 유무로 자연스럽게 정해준다.
 */
export function inferGrain(
  item: UpsertExportImportItemDto,
): 'COMMODITY' | 'PARTNER' | 'PARTNER_COMMODITY' {
  if (item.grain) return item.grain
  const hasPartner =
    partnerRefCount(item) > 0 ||
    (item.partnerLabel != null && item.partnerLabel !== '')
  const hasCommodity =
    (item.commodityId != null && item.commodityId !== '') ||
    (item.name != null && item.name.trim() !== '')
  if (hasPartner && hasCommodity) return 'PARTNER_COMMODITY'
  if (hasPartner) return 'PARTNER'
  return 'COMMODITY'
}

/** 빈 문자열은 FK에 넣으면 안 된다 — null로 눕힌다. */
function ref(value: string | null | undefined): string | null {
  return value != null && value !== '' ? value : null
}

function text(value: string | null | undefined): string | null {
  if (value == null) return null
  const trimmed = value.trim()
  return trimmed === '' ? null : trimmed
}

/** 카탈로그 품목명을 조회해 표기명이 빈 행을 채우기 위한 최소 표면 */
export interface CommodityNameReader {
  tradeCommodity: {
    findMany(args: {
      where: { id: { in: string[] } }
      select: { id: true; name: true; categoryId: true }
    }): Promise<Array<{ id: string; name: string; categoryId: string }>>
  }
}

/**
 * 흐름 배열을 Prisma `createMany` 데이터로 옮긴다.
 *
 * - 표기명이 비었고 카탈로그 품목을 골랐으면 품목명으로 채운다.
 * - 분류를 안 걸었으면 품목의 분류를 물려받는다(자유 입력 행은 그대로 null).
 * - 상대는 하나만 — 둘 이상 걸리면 어느 쪽으로 세야 할지 알 수 없으므로 막는다.
 */
export async function buildFlowCreateData(
  prisma: CommodityNameReader,
  exportImportId: string,
  items: UpsertExportImportItemDto[],
): Promise<Record<string, unknown>[]> {
  const commodityIds = Array.from(
    new Set(items.map((item) => ref(item.commodityId)).filter((id): id is string => id != null)),
  )
  const commodities = commodityIds.length
    ? await prisma.tradeCommodity.findMany({
        where: { id: { in: commodityIds } },
        select: { id: true, name: true, categoryId: true },
      })
    : []
  const commodityById = new Map(commodities.map((row) => [row.id, row]))

  return items.map((item, index) => {
    if (partnerRefCount(item) > 1) {
      throw new BadRequestException(
        '교역 상대는 하나만 지정할 수 있습니다 (현대 국가·역사 국가·조직 중 하나).',
      )
    }
    const commodityId = ref(item.commodityId)
    const commodity = commodityId ? commodityById.get(commodityId) : undefined
    if (commodityId && !commodity) {
      throw new BadRequestException(`존재하지 않는 교역 품목입니다: ${commodityId}`)
    }
    const name = text(item.name) ?? commodity?.name
    if (!name) {
      throw new BadRequestException('품목명 또는 카탈로그 품목이 필요합니다.')
    }

    return {
      exportImportId,
      direction: item.direction,
      grain: inferGrain(item),

      commodityId,
      name,
      categoryId: ref(item.categoryId) ?? commodity?.categoryId ?? null,
      hsCode: text(item.hsCode),

      partnerCountryId: ref(item.partnerCountryId),
      partnerHistoricalCountryId: ref(item.partnerHistoricalCountryId),
      partnerOrganizationId: ref(item.partnerOrganizationId),
      partnerLabel: text(item.partnerLabel),

      value: item.value ?? null,
      sharePct: item.sharePct ?? null,
      quantity: item.quantity ?? null,
      quantityUnit: text(item.quantityUnit),
      unitPrice: item.unitPrice ?? null,
      priceBasis: item.priceBasis ?? null,
      rankInDirection: item.rankInDirection ?? null,
      yoyPct: item.yoyPct ?? null,

      channel: item.channel ?? null,
      restriction: item.restriction ?? null,
      tariffRatePct: item.tariffRatePct ?? null,
      isReExport: item.isReExport ?? false,
      transportMode: item.transportMode ?? null,
      routeName: text(item.routeName),
      portName: text(item.portName),

      relatedEventId: ref(item.relatedEventId),
      relatedTreatyId: ref(item.relatedTreatyId),
      relatedCompanyId: ref(item.relatedCompanyId),

      isEstimate: item.isEstimate ?? false,
      sourceNote: text(item.sourceNote),
      notes: item.notes ?? null,
      sortOrder: item.sortOrder ?? index,
    }
  })
}

/** 헤더에서 쓰기 가능한 칸만 골라낸다 (주체·연도·흐름은 호출부가 따로 다룬다). */
export function buildRecordWritable(dto: UpsertExportImportDto) {
  return {
    periodEndYear: dto.periodEndYear ?? null,
    aggregation: dto.aggregation ?? 'ANNUAL',
    exportValue: dto.exportValue ?? null,
    importValue: dto.importValue ?? null,
    currencyCode: text(dto.currencyCode),
    valueScale: dto.valueScale ?? 'ONE',
    priceNote: text(dto.priceNote),
    priceBasis: dto.priceBasis ?? null,
    sourceName: text(dto.sourceName),
    sourceUrl: text(dto.sourceUrl),
    isEstimate: dto.isEstimate ?? false,
    confidence: dto.confidence ?? null,
    note: dto.note ?? null,
  }
}

/**
 * 기간 자료의 끝 연도가 시작보다 앞서면 조용히 뒤집지 말고 막는다 —
 * "1869–1860"은 자료를 잘못 읽은 것이지 표기 흔들림이 아니다.
 */
export function assertPeriodOrder(dto: UpsertExportImportDto): void {
  if (dto.periodEndYear == null) return
  const era = dto.era ?? 'AD'
  const start = era === 'BC' ? -dto.year : dto.year
  const end = era === 'BC' ? -dto.periodEndYear : dto.periodEndYear
  if (end < start) {
    throw new BadRequestException('기간 끝 연도가 시작 연도보다 앞설 수 없습니다.')
  }
}
