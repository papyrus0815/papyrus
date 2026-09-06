/**
 * 교역(Trade) React Query 훅.
 *
 * 카탈로그(분류·품목)는 자주 바뀌지 않고 어느 화면에서나 같은 목록이라 길게 잡아 둔다.
 * 기록은 국가별이라 스코프 키를 나눈다.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import * as tradeApi from '@/shared/api/trade'
import type {
  CommodityTradeFlowRow,
  TradeCommodity,
  TradeCommodityCategory,
  TradeCommodityListQuery,
  TradeFlow,
  TradeRecord,
  TradeRecordListQuery,
  UpsertTradeCommodityCategoryInput,
  UpsertTradeCommodityInput,
  UpsertTradeFlowInput,
  UpsertTradeRecordInput,
} from '@/shared/api/trade'

export type {
  CommodityTradeFlowRow,
  TradeCommodity,
  TradeCommodityCategory,
  TradeFlow,
  TradeRecord,
  UpsertTradeCommodityInput,
  UpsertTradeFlowInput,
  UpsertTradeRecordInput,
}

export const tradeKeys = {
  categories: ['trade', 'commodity-categories'] as const,
  commodities: (query: TradeCommodityListQuery = {}) =>
    ['trade', 'commodities', query] as const,
  commodityFlows: (commodityId: string) =>
    ['trade', 'commodities', commodityId, 'flows'] as const,
  records: (query: TradeRecordListQuery = {}) =>
    ['trade', 'records', query] as const,
}

/* 카탈로그는 화면마다 다시 받을 이유가 없다 — 세션 내내 같은 목록이다 */
const CATALOG_STALE_MS = 10 * 60 * 1000

export function useTradeCommodityCategories() {
  return useQuery<TradeCommodityCategory[]>({
    queryKey: tradeKeys.categories,
    queryFn: () => tradeApi.getTradeCommodityCategories(),
    staleTime: CATALOG_STALE_MS,
  })
}

export function useTradeCommodities(query: TradeCommodityListQuery = {}) {
  return useQuery<TradeCommodity[]>({
    queryKey: tradeKeys.commodities(query),
    queryFn: () => tradeApi.getTradeCommodities(query),
    staleTime: CATALOG_STALE_MS,
  })
}

export function useCommodityFlows(commodityId: string | null | undefined) {
  return useQuery<CommodityTradeFlowRow[]>({
    queryKey: tradeKeys.commodityFlows(commodityId ?? ''),
    queryFn: () => tradeApi.getCommodityFlows(commodityId!),
    enabled: !!commodityId,
  })
}

/** 카탈로그를 고친 뒤에는 목록·검색 결과가 모두 갈리므로 프리픽스로 한꺼번에 턴다. */
function useCatalogInvalidation() {
  const queryClient = useQueryClient()
  return () => {
    queryClient.invalidateQueries({ queryKey: ['trade', 'commodities'] })
    queryClient.invalidateQueries({ queryKey: tradeKeys.categories })
  }
}

export function useCreateTradeCommodity() {
  const invalidate = useCatalogInvalidation()
  return useMutation({
    mutationFn: (dto: UpsertTradeCommodityInput) =>
      tradeApi.createTradeCommodity(dto),
    onSuccess: invalidate,
  })
}

export function useUpdateTradeCommodity() {
  const invalidate = useCatalogInvalidation()
  return useMutation({
    mutationFn: (vars: { id: string; dto: UpsertTradeCommodityInput }) =>
      tradeApi.updateTradeCommodity(vars.id, vars.dto),
    onSuccess: invalidate,
  })
}

export function useDeleteTradeCommodity() {
  const invalidate = useCatalogInvalidation()
  return useMutation({
    mutationFn: (id: string) => tradeApi.deleteTradeCommodity(id),
    onSuccess: invalidate,
  })
}

export function useCreateTradeCommodityCategory() {
  const invalidate = useCatalogInvalidation()
  return useMutation({
    mutationFn: (dto: UpsertTradeCommodityCategoryInput) =>
      tradeApi.createTradeCommodityCategory(dto),
    onSuccess: invalidate,
  })
}

export function useTradeRecords(query: TradeRecordListQuery) {
  const enabled = !!(query.countryId || query.historicalCountryId)
  return useQuery<TradeRecord[]>({
    queryKey: tradeKeys.records(query),
    queryFn: () => tradeApi.getTradeRecords(query),
    enabled,
  })
}

export function useUpsertTradeRecord() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (dto: UpsertTradeRecordInput) =>
      tradeApi.upsertTradeRecord(dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trade', 'records'] })
      /* 현대 국가 대시보드는 아직 countries 창구를 쓴다 — 같이 털어야 화면이 맞는다 */
      queryClient.invalidateQueries({ queryKey: ['countries'] })
    },
  })
}

export function useDeleteTradeRecord() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => tradeApi.deleteTradeRecord(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trade', 'records'] })
      queryClient.invalidateQueries({ queryKey: ['countries'] })
    },
  })
}
