import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import {
  type AdminDivisionConfig,
  type AdministrativeDivision,
  type AdministrativeDivisionSearchHit,
  type BulkCreateAdministrativeDivisionsInput,
  type CreateAdminDivisionConfigInput,
  type CreateAdministrativeDivisionInput,
  type UpdateAdminDivisionConfigInput,
  type UpdateAdministrativeDivisionInput,
  cityApi,
} from '@/shared/api/city'

export type {
  AdminDivisionConfig,
  AdministrativeDivision,
  AdministrativeDivisionSearchHit,
} from '@/shared/api/city'

export const administrativeDivisionKeys = {
  all: ['administrative-divisions'] as const,
  byCountry: (countryId: string) =>
    ['administrative-divisions', { countryId }] as const,
}

export const adminDivisionConfigKeys = {
  all: ['admin-division-configs'] as const,
  byCountry: (countryId: string) =>
    ['admin-division-configs', { countryId }] as const,
}

/**
 * 국가별 행정구역 트리 조회 (최상위만 반환, 자식은 nested로 포함)
 */
export function useAdministrativeDivisions(countryId: string | undefined) {
  return useQuery({
    queryKey: administrativeDivisionKeys.byCountry(countryId ?? ''),
    queryFn: async (): Promise<AdministrativeDivision[]> => {
      if (!countryId) return []
      return await cityApi.getAdministrativeDivisions(countryId)
    },
    enabled: !!countryId,
  })
}

/** 국가별 행정구역 단위(레벨) 설정 */
export function useAdminDivisionConfigs(countryId: string | undefined) {
  return useQuery({
    queryKey: adminDivisionConfigKeys.byCountry(countryId ?? ''),
    queryFn: async (): Promise<AdminDivisionConfig[]> => {
      if (!countryId) return []
      return await cityApi.getAdminDivisionConfigs(countryId)
    },
    enabled: !!countryId,
  })
}

function useInvalidateForCountry(countryId: string | undefined) {
  const qc = useQueryClient()
  return () => {
    if (!countryId) return
    qc.invalidateQueries({
      queryKey: administrativeDivisionKeys.byCountry(countryId),
    })
    qc.invalidateQueries({
      queryKey: adminDivisionConfigKeys.byCountry(countryId),
    })
  }
}

export function useCreateAdminDivisionConfig(countryId: string | undefined) {
  const invalidate = useInvalidateForCountry(countryId)
  return useMutation({
    mutationFn: (input: CreateAdminDivisionConfigInput) =>
      cityApi.createAdminDivisionConfig(input),
    onSuccess: invalidate,
  })
}

export function useUpdateAdminDivisionConfig(countryId: string | undefined) {
  const invalidate = useInvalidateForCountry(countryId)
  return useMutation({
    mutationFn: ({
      id,
      input,
    }: {
      id: string
      input: UpdateAdminDivisionConfigInput
    }) => cityApi.updateAdminDivisionConfig(id, input),
    onSuccess: invalidate,
  })
}

export function useDeleteAdminDivisionConfig(countryId: string | undefined) {
  const invalidate = useInvalidateForCountry(countryId)
  return useMutation({
    mutationFn: (id: string) => cityApi.deleteAdminDivisionConfig(id),
    onSuccess: invalidate,
  })
}

export function useCreateAdministrativeDivision(
  countryId: string | undefined,
) {
  const invalidate = useInvalidateForCountry(countryId)
  return useMutation({
    mutationFn: (input: CreateAdministrativeDivisionInput) =>
      cityApi.createAdministrativeDivision(input),
    onSuccess: invalidate,
  })
}

export function useUpdateAdministrativeDivision(
  countryId: string | undefined,
) {
  const invalidate = useInvalidateForCountry(countryId)
  return useMutation({
    mutationFn: ({
      id,
      input,
    }: {
      id: string
      input: UpdateAdministrativeDivisionInput
    }) => cityApi.updateAdministrativeDivision(id, input),
    onSuccess: invalidate,
  })
}

export function useDeleteAdministrativeDivision(
  countryId: string | undefined,
) {
  const invalidate = useInvalidateForCountry(countryId)
  return useMutation({
    mutationFn: (id: string) => cityApi.deleteAdministrativeDivision(id),
    onSuccess: invalidate,
  })
}

export function useBulkCreateAdministrativeDivisions(
  countryId: string | undefined,
) {
  const invalidate = useInvalidateForCountry(countryId)
  return useMutation({
    mutationFn: (input: BulkCreateAdministrativeDivisionsInput) =>
      cityApi.bulkCreateAdministrativeDivisions(input),
    onSuccess: invalidate,
  })
}

/** 행정구역 평탄 검색 — 디바운스해서 호출하는 게 좋음. limit으로 페이지 확대. */
export function useAdministrativeDivisionSearch(
  q: string,
  countryId: string | undefined,
  limit = 50,
) {
  return useQuery({
    queryKey: ['administrative-divisions/search', { q, countryId, limit }],
    queryFn: async (): Promise<AdministrativeDivisionSearchHit[]> => {
      if (!countryId || q.trim().length < 1) return []
      return await cityApi.searchAdministrativeDivisions(q, countryId, limit)
    },
    enabled: !!countryId && q.trim().length >= 1,
  })
}

/**
 * 트리에서 ID로 노드를 찾는 헬퍼 (재귀)
 */
export function findDivisionById(
  divisions: AdministrativeDivision[],
  id: string,
): AdministrativeDivision | null {
  for (const div of divisions) {
    if (div.id === id) return div
    if (div.children?.length) {
      const found = findDivisionById(div.children, id)
      if (found) return found
    }
  }
  return null
}
