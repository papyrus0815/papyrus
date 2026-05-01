import { useQuery } from '@tanstack/react-query'

import {
  type Infrastructure,
  type InfrastructureType,
  infrastructureApi,
} from '@/shared/api/infrastructure'

export type {
  Infrastructure,
  InfrastructureType,
} from '@/shared/api/infrastructure'

export const infrastructureKeys = {
  all: ['infrastructures'] as const,
  byCountry: (countryId: string, type?: InfrastructureType) =>
    ['infrastructures', { countryId, type: type ?? 'all' }] as const,
}

/**
 * 국가별 인프라 항목 조회 (고속도로·철도·공항·항구).
 * type 미지정 시 전체.
 */
export function useInfrastructures(
  countryId: string | undefined,
  type?: InfrastructureType,
) {
  return useQuery({
    queryKey: infrastructureKeys.byCountry(countryId ?? '', type),
    queryFn: async (): Promise<Infrastructure[]> => {
      if (!countryId) return []
      return await infrastructureApi.list({ countryId, type })
    },
    enabled: !!countryId,
  })
}
