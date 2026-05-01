import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import {
  type CreateNaturalFeatureInput,
  type NaturalFeature,
  type NaturalFeatureType,
  type UpdateNaturalFeatureInput,
  naturalFeatureApi,
} from '@/shared/api/natural-feature'

export type {
  CreateNaturalFeatureInput,
  NaturalFeature,
  NaturalFeatureType,
  UpdateNaturalFeatureInput,
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

export function useCreateNaturalFeature() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateNaturalFeatureInput) =>
      naturalFeatureApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: naturalFeatureKeys.all })
    },
  })
}

export function useUpdateNaturalFeature() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string
      data: UpdateNaturalFeatureInput
    }) => naturalFeatureApi.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: naturalFeatureKeys.all })
    },
  })
}

export function useDeleteNaturalFeature() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => naturalFeatureApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: naturalFeatureKeys.all })
    },
  })
}
