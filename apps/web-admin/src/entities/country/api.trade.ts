/**
 * 국가 교역(ExportImport) React Query 훅.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import * as tradeApi from '@/shared/api/country-trade'
import type {
  ExportImport,
  UpsertExportImportInput,
} from '@/shared/api/country-trade'

export type { ExportImport, UpsertExportImportInput }

/** 교역 방향 — 한 품목 행은 수출이거나 수입이다 */
export type TradeDirection = ExportImport['items'][number]['direction']
/** 응답 품목 한 줄 */
export type ExportImportItem = ExportImport['items'][number]
/** 저장 입력 품목 한 줄 (자식 id 없음 — 서버가 배열 통째 교체) */
export type UpsertExportImportItem = NonNullable<
  UpsertExportImportInput['items']
>[number]

export const countryTradeKeys = {
  list: (countryId: string) =>
    ['countries', countryId, 'export-imports'] as const,
}

export function useExportImports(countryId: string | null | undefined) {
  return useQuery<ExportImport[]>({
    queryKey: countryTradeKeys.list(countryId ?? ''),
    queryFn: () => tradeApi.getExportImports(countryId!),
    enabled: !!countryId,
  })
}

export function useUpsertExportImport(countryId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (dto: UpsertExportImportInput) =>
      tradeApi.upsertExportImport(countryId, dto),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: countryTradeKeys.list(countryId) }),
  })
}

export function useDeleteExportImport(countryId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (year: number) =>
      tradeApi.deleteExportImport(countryId, year),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: countryTradeKeys.list(countryId) }),
  })
}
