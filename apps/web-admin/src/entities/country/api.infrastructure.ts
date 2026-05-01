import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import {
  type CreateInfrastructureInput,
  type Infrastructure,
  type InfrastructureType,
  type UpdateInfrastructureInput,
  infrastructureApi,
} from '@/shared/api/infrastructure'

export type {
  CreateInfrastructureInput,
  Infrastructure,
  InfrastructureType,
  UpdateInfrastructureInput,
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

export function useCreateInfrastructure() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateInfrastructureInput) =>
      infrastructureApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: infrastructureKeys.all })
    },
  })
}

export function useUpdateInfrastructure() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string
      data: UpdateInfrastructureInput
    }) => infrastructureApi.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: infrastructureKeys.all })
    },
  })
}

export function useDeleteInfrastructure() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => infrastructureApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: infrastructureKeys.all })
    },
  })
}
