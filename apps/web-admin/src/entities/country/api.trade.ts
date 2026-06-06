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
