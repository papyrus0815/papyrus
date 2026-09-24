/**
 * 국가 지표(경제·인구·발전) React Query 훅.
 *
 * 백엔드/SDK에는 풀 엔드포인트가 있었으나 프론트 연결이 없던 부분을 연결한다.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import * as indicatorsApi from '@/shared/api/country-indicators'
import type {
  BondYield,
  BondMaturity,
  UpsertBondYieldInput,
  EconomicIndicator,
  DemographicIndicator,
  DevelopmentIndicator,
  IndicatorYearRange,
  UpsertEconomicIndicatorInput,
  UpsertDemographicIndicatorInput,
  UpsertDevelopmentIndicatorInput,
} from '@/shared/api/country-indicators'

export type {
  BondYield,
  BondMaturity,
  UpsertBondYieldInput,
  EconomicIndicator,
  DemographicIndicator,
  DevelopmentIndicator,
  IndicatorYearRange,
  UpsertEconomicIndicatorInput,
  UpsertDemographicIndicatorInput,
  UpsertDevelopmentIndicatorInput,
}

export const countryIndicatorKeys = {
  economicAll: (countryId: string) =>
    ['countries', countryId, 'economic-indicators'] as const,
  demographicAll: (countryId: string) =>
    ['countries', countryId, 'demographic-indicators'] as const,
  developmentAll: (countryId: string) =>
    ['countries', countryId, 'development-indicators'] as const,
  economic: (countryId: string, range?: IndicatorYearRange) =>
    ['countries', countryId, 'economic-indicators', range ?? null] as const,
  demographic: (countryId: string, range?: IndicatorYearRange) =>
    ['countries', countryId, 'demographic-indicators', range ?? null] as const,
  development: (countryId: string, range?: IndicatorYearRange) =>
    ['countries', countryId, 'development-indicators', range ?? null] as const,
  bondYieldsAll: (countryId: string) =>
    ['countries', countryId, 'bond-yields'] as const,
  bondYields: (countryId: string, range?: IndicatorYearRange) =>
    ['countries', countryId, 'bond-yields', range ?? null] as const,
}

const INDICATOR_STALE_TIME = 1000 * 60 * 5 // 5분

export function useEconomicIndicators(
  countryId: string | null | undefined,
  range?: IndicatorYearRange,
) {
  return useQuery<EconomicIndicator[]>({
    queryKey: countryIndicatorKeys.economic(countryId ?? '', range),
    queryFn: () => indicatorsApi.getEconomicIndicators(countryId!, range),
    enabled: !!countryId,
    staleTime: INDICATOR_STALE_TIME,
  })
}

export function useDemographicIndicators(
  countryId: string | null | undefined,
  range?: IndicatorYearRange,
) {
  return useQuery<DemographicIndicator[]>({
    queryKey: countryIndicatorKeys.demographic(countryId ?? '', range),
    queryFn: () => indicatorsApi.getDemographicIndicators(countryId!, range),
    enabled: !!countryId,
    staleTime: INDICATOR_STALE_TIME,
  })
}

export function useDevelopmentIndicators(
  countryId: string | null | undefined,
  range?: IndicatorYearRange,
) {
  return useQuery<DevelopmentIndicator[]>({
    queryKey: countryIndicatorKeys.development(countryId ?? '', range),
    queryFn: () => indicatorsApi.getDevelopmentIndicators(countryId!, range),
    enabled: !!countryId,
    staleTime: INDICATOR_STALE_TIME,
  })
}

// ── 쓰기 (upsert / delete) ───────────────────────────────────

export function useUpsertEconomicIndicator(countryId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (dto: UpsertEconomicIndicatorInput) =>
      indicatorsApi.upsertEconomicIndicator(countryId, dto),
    onSuccess: () =>
      qc.invalidateQueries({
        queryKey: countryIndicatorKeys.economicAll(countryId),
      }),
  })
}

export function useDeleteEconomicIndicator(countryId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (year: number) =>
      indicatorsApi.deleteEconomicIndicator(countryId, year),
    onSuccess: () =>
      qc.invalidateQueries({
        queryKey: countryIndicatorKeys.economicAll(countryId),
      }),
  })
}

export function useUpsertDemographicIndicator(countryId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (dto: UpsertDemographicIndicatorInput) =>
      indicatorsApi.upsertDemographicIndicator(countryId, dto),
    onSuccess: () =>
      qc.invalidateQueries({
        queryKey: countryIndicatorKeys.demographicAll(countryId),
      }),
  })
}

export function useDeleteDemographicIndicator(countryId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (year: number) =>
      indicatorsApi.deleteDemographicIndicator(countryId, year),
    onSuccess: () =>
      qc.invalidateQueries({
        queryKey: countryIndicatorKeys.demographicAll(countryId),
      }),
  })
}

export function useUpsertDevelopmentIndicator(countryId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (dto: UpsertDevelopmentIndicatorInput) =>
      indicatorsApi.upsertDevelopmentIndicator(countryId, dto),
    onSuccess: () =>
      qc.invalidateQueries({
        queryKey: countryIndicatorKeys.developmentAll(countryId),
      }),
  })
}

export function useDeleteDevelopmentIndicator(countryId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (year: number) =>
      indicatorsApi.deleteDevelopmentIndicator(countryId, year),
    onSuccess: () =>
      qc.invalidateQueries({
        queryKey: countryIndicatorKeys.developmentAll(countryId),
      }),
  })
}

// ── 국채 금리 ────────────────────────────────────────────────

/**
 * 국채 금리 — 한 해에 만기 수만큼 행이 온다. 캐시 키는 다른 지표와 같은 자리에 두되
 * 무효화는 `bondYieldsAll` 프리픽스로 한 번에 한다(연도 범위별 캐시가 갈리므로).
 */
export function useBondYields(
  countryId: string | null | undefined,
  range?: IndicatorYearRange,
) {
  return useQuery<BondYield[]>({
    queryKey: countryIndicatorKeys.bondYields(countryId ?? '', range),
    queryFn: () => indicatorsApi.getBondYields(countryId!, range),
    enabled: !!countryId,
    staleTime: INDICATOR_STALE_TIME,
  })
}

export function useUpsertBondYield(countryId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (dto: UpsertBondYieldInput) =>
      indicatorsApi.upsertBondYield(countryId, dto),
    onSuccess: () =>
      qc.invalidateQueries({
        queryKey: countryIndicatorKeys.bondYieldsAll(countryId),
      }),
  })
}

export function useDeleteBondYield(countryId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (key: { year: number; maturity: BondMaturity }) =>
      indicatorsApi.deleteBondYield(countryId, key.year, key.maturity),
    onSuccess: () =>
      qc.invalidateQueries({
        queryKey: countryIndicatorKeys.bondYieldsAll(countryId),
      }),
  })
}
