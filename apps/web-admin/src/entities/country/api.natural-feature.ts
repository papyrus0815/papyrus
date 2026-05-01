import { useQuery } from '@tanstack/react-query'

import {
  type NaturalFeature,
  type NaturalFeatureType,
  naturalFeatureApi,
} from '@/shared/api/natural-feature'

export type {
  NaturalFeature,
  NaturalFeatureType,
} from '@/shared/api/natural-feature'

export const naturalFeatureKeys = {
  all: ['natural-features'] as const,
  byCountry: (countryId: string, type?: NaturalFeatureType) =>
    ['natural-features', { countryId, type: type ?? 'all' }] as const,
}

/**
 * 국가별 자연 지리 항목 조회 (산·강·호수·해안).
 * type 미지정 시 전체.
 */
export function useNaturalFeatures(
  countryId: string | undefined,
  type?: NaturalFeatureType,
) {
  return useQuery({
    queryKey: naturalFeatureKeys.byCountry(countryId ?? '', type),
    queryFn: async (): Promise<NaturalFeature[]> => {
      if (!countryId) return []
      return await naturalFeatureApi.list({ countryId, type })
    },
    enabled: !!countryId,
  })
}
