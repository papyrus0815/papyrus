/**
 * 교역(Trade) API 래퍼.
 *
 * 백엔드는 두 창구다 —
 *  - `/trade/commodities`, `/trade/commodity-categories` : 품목 카탈로그
 *  - `/trade/records` : 현대·역사 국가 교역 기록 (주체를 몸통에 실어 보낸다)
 *
 * 기존 `/countries/:id/export-imports`(country-trade.ts)도 살아 있고 응답 모양이 같다.
 * 현대 국가 대시보드는 그쪽을, 역사 국가·교차 조회는 이쪽을 쓴다.
 */
import * as tradeApi from '@api/functional/trade'

import { getApiConnection } from './client'

export type TradeCommodity = Awaited<
  ReturnType<typeof tradeApi.commodities.listCommodities>
>[number]
export type TradeCommodityCategory = Awaited<
  ReturnType<typeof tradeApi.commodity_categories.listCategories>
>[number]
export type TradeRecord = Awaited<
  ReturnType<typeof tradeApi.records.list>
>[number]
export type TradeFlow = TradeRecord['items'][number]
export type CommodityTradeFlowRow = Awaited<
  ReturnType<typeof tradeApi.commodities.flows.getCommodityFlows>
>[number]

export type UpsertTradeRecordInput = Parameters<
  typeof tradeApi.records.upsert
>[1]
export type UpsertTradeFlowInput = NonNullable<
  UpsertTradeRecordInput['items']
>[number]
export type UpsertTradeCommodityInput = Parameters<
  typeof tradeApi.commodities.createCommodity
>[1]
export type UpsertTradeCommodityCategoryInput = Parameters<
  typeof tradeApi.commodity_categories.createCategory
>[1]

export type TradeCommodityListQuery = Parameters<
  typeof tradeApi.commodities.listCommodities
>[1]
export type TradeRecordListQuery = Parameters<typeof tradeApi.records.list>[1]

/** SDK 응답은 배열이 그대로일 때도, `{ data }`로 감싸일 때도 있다. */
function unwrap<T>(response: unknown): T[] {
  const payload = response as { data?: T[] } | T[]
  if (Array.isArray(payload)) return payload
  return payload?.data ?? []
}
function unwrapOne<T>(response: unknown): T {
  const payload = response as { data?: T } | T
  if (payload && typeof payload === 'object' && 'data' in (payload as object)) {
    const inner = (payload as { data?: T }).data
    if (inner !== undefined) return inner
  }
  return payload as T
}

// ── 카탈로그 ─────────────────────────────────────────────────

export async function getTradeCommodityCategories(): Promise<
  TradeCommodityCategory[]
> {
  const response = await tradeApi.commodity_categories.listCategories(
    getApiConnection(),
  )
  return unwrap<TradeCommodityCategory>(response)
}

export async function createTradeCommodityCategory(
  dto: UpsertTradeCommodityCategoryInput,
): Promise<TradeCommodityCategory> {
  const response = await tradeApi.commodity_categories.createCategory(
    getApiConnection(),
    dto,
  )
  return unwrapOne<TradeCommodityCategory>(response)
}

export async function updateTradeCommodityCategory(
  id: string,
  dto: UpsertTradeCommodityCategoryInput,
): Promise<TradeCommodityCategory> {
  const response = await tradeApi.commodity_categories.updateCategory(
    getApiConnection(),
    id,
    dto,
  )
  return unwrapOne<TradeCommodityCategory>(response)
}

export async function deleteTradeCommodityCategory(id: string): Promise<void> {
  await tradeApi.commodity_categories.deleteCategory(getApiConnection(), id)
}

export async function getTradeCommodities(
  query: TradeCommodityListQuery = {},
): Promise<TradeCommodity[]> {
  const response = await tradeApi.commodities.listCommodities(
    getApiConnection(),
    query,
  )
  return unwrap<TradeCommodity>(response)
}

export async function createTradeCommodity(
  dto: UpsertTradeCommodityInput,
): Promise<TradeCommodity> {
  const response = await tradeApi.commodities.createCommodity(
    getApiConnection(),
    dto,
  )
  return unwrapOne<TradeCommodity>(response)
}

export async function updateTradeCommodity(
  id: string,
  dto: UpsertTradeCommodityInput,
): Promise<TradeCommodity> {
  const response = await tradeApi.commodities.updateCommodity(
    getApiConnection(),
    id,
    dto,
  )
  return unwrapOne<TradeCommodity>(response)
}

export async function deleteTradeCommodity(id: string): Promise<void> {
  await tradeApi.commodities.deleteCommodity(getApiConnection(), id)
}

/** 이 품목을 누가·언제·누구와 주고받았나 — 카탈로그가 있어야 물을 수 있는 가로줄. */
export async function getCommodityFlows(
  commodityId: string,
  query: { direction?: 'EXPORT' | 'IMPORT'; limit?: number } = {},
): Promise<CommodityTradeFlowRow[]> {
  const response = await tradeApi.commodities.flows.getCommodityFlows(
    getApiConnection(),
    commodityId,
    query,
  )
  return unwrap<CommodityTradeFlowRow>(response)
}

// ── 기록 ─────────────────────────────────────────────────────

export async function getTradeRecords(
  query: TradeRecordListQuery = {},
): Promise<TradeRecord[]> {
  const response = await tradeApi.records.list(getApiConnection(), query)
  return unwrap<TradeRecord>(response)
}

export async function upsertTradeRecord(
  dto: UpsertTradeRecordInput,
): Promise<TradeRecord> {
  const response = await tradeApi.records.upsert(getApiConnection(), dto)
  return unwrapOne<TradeRecord>(response)
}

export async function deleteTradeRecord(id: string): Promise<void> {
  await tradeApi.records.remove(getApiConnection(), id)
}
