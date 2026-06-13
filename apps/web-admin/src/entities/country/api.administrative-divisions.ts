import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { invalidateGamification } from '@/entities/gamification'
import {
  type AdminDivisionConfig,
  type AdminDivisionScheme,
  type AdminDivisionSection,
  type AdministrativeDivision,
  type AdministrativeDivisionSearchHit,
  type BulkCreateAdministrativeDivisionsInput,
  type CreateAdminDivisionConfigInput,
  type CreateAdminDivisionSchemeInput,
  type CreateAdministrativeDivisionInput,
  type DivisionOwner,
  type UpdateAdminDivisionConfigInput,
  type UpdateAdminDivisionSchemeInput,
  type UpdateAdministrativeDivisionInput,
  cityApi,
} from '@/shared/api/city'

export type {
  AdminDivisionConfig,
  AdminDivisionScheme,
  AdminDivisionSection,
  AdminDivisionSectionInput,
  AdministrativeDivision,
  AdministrativeDivisionSearchHit,
  CreateAdminDivisionSchemeInput,
  DivisionOwner,
  UpdateAdminDivisionSchemeInput,
} from '@/shared/api/city'

/**
 * 훅 입력 — 현대 국가 ID(string, 하위 호환) 또는 owner 객체.
 * 역사적 국가는 { historicalCountryId } 형태로 전달한다.
 */
export type DivisionOwnerInput = string | DivisionOwner | undefined

/** string(현대 국가 ID) 입력을 owner 객체로 정규화 */
function normalizeOwner(input: DivisionOwnerInput): DivisionOwner | undefined {
  if (!input) return undefined
  if (typeof input === 'string') return { countryId: input }
  return input
}

/** 쿼리 키용 안정 식별자 */
function ownerKey(owner: DivisionOwner | undefined): {
  countryId: string
  historicalCountryId: string
} {
  return {
    countryId: owner?.countryId ?? '',
    historicalCountryId: owner?.historicalCountryId ?? '',
  }
}

export const administrativeDivisionKeys = {
  all: ['administrative-divisions'] as const,
  byOwner: (owner: DivisionOwner | undefined) =>
    ['administrative-divisions', ownerKey(owner)] as const,
}

export const adminDivisionConfigKeys = {
  all: ['admin-division-configs'] as const,
  byOwner: (owner: DivisionOwner | undefined) =>
    ['admin-division-configs', ownerKey(owner)] as const,
}

/**
 * 국가별 행정구역 트리 조회 (최상위만 반환, 자식은 nested로 포함).
 * schemeId가 있으면 해당 체계 소속 구역만.
 */
export function useAdministrativeDivisions(
  ownerInput: DivisionOwnerInput,
  schemeId?: string | null,
) {
  const owner = normalizeOwner(ownerInput)
  return useQuery({
    queryKey: [
      ...administrativeDivisionKeys.byOwner(owner),
      { schemeId: schemeId ?? '' },
    ],
    queryFn: async (): Promise<AdministrativeDivision[]> => {
      if (!owner) return []
      return await cityApi.getAdministrativeDivisions(owner, schemeId)
    },
    enabled: !!owner,
  })
}

/** 국가별 행정구역 단위(레벨) 설정 — schemeId 지정 시 체계 전용 + 공용 */
export function useAdminDivisionConfigs(
  ownerInput: DivisionOwnerInput,
  schemeId?: string | null,
) {
  const owner = normalizeOwner(ownerInput)
  return useQuery({
    queryKey: [
      ...adminDivisionConfigKeys.byOwner(owner),
      { schemeId: schemeId ?? '' },
    ],
    queryFn: async (): Promise<AdminDivisionConfig[]> => {
      if (!owner) return []
      return await cityApi.getAdminDivisionConfigs(owner, schemeId)
    },
    enabled: !!owner,
  })
}

/** 행정구역 체계 목록 (owner 기준) */
export function useAdminDivisionSchemes(ownerInput: DivisionOwnerInput) {
  const owner = normalizeOwner(ownerInput)
  return useQuery({
    queryKey: ['admin-division-schemes', ownerKey(owner)],
    queryFn: async (): Promise<AdminDivisionScheme[]> => {
      if (!owner) return []
      return await cityApi.getAdminDivisionSchemes(owner)
    },
    enabled: !!owner,
  })
}

/** 모든 국가의 행정구역 체계 (비교 모드용 — ownerName 포함) */
export function useAllAdminDivisionSchemes(enabled = true) {
  return useQuery({
    queryKey: ['admin-division-schemes', 'all'],
    queryFn: () => cityApi.getAdminDivisionSchemes('all'),
    enabled,
  })
}

export function useCreateAdminDivisionScheme(ownerInput: DivisionOwnerInput) {
  const invalidate = useInvalidateForOwner(ownerInput)
  return useMutation({
    mutationFn: (input: CreateAdminDivisionSchemeInput) =>
      cityApi.createAdminDivisionScheme(input),
    onSuccess: invalidate,
  })
}

export function useUpdateAdminDivisionScheme(ownerInput: DivisionOwnerInput) {
  const invalidate = useInvalidateForOwner(ownerInput)
  return useMutation({
    mutationFn: ({
      id,
      input,
    }: {
      id: string
      input: UpdateAdminDivisionSchemeInput
    }) => cityApi.updateAdminDivisionScheme(id, input),
    onSuccess: invalidate,
  })
}

export function useDeleteAdminDivisionScheme(ownerInput: DivisionOwnerInput) {
  const invalidate = useInvalidateForOwner(ownerInput)
  return useMutation({
    mutationFn: (id: string) => cityApi.deleteAdminDivisionScheme(id),
    onSuccess: invalidate,
  })
}

function useInvalidateForOwner(ownerInput: DivisionOwnerInput) {
  const qc = useQueryClient()
  const owner = normalizeOwner(ownerInput)
  return () => {
    if (!owner) return
    // schemeId 등 파생 키가 byOwner 아래에 붙으므로 prefix로 넓게 무효화 —
    // 관리 도구 트래픽 수준에선 broad invalidation이 단순·안전하다.
    qc.invalidateQueries({ queryKey: administrativeDivisionKeys.all })
    qc.invalidateQueries({ queryKey: adminDivisionConfigKeys.all })
    qc.invalidateQueries({ queryKey: ['administrative-divisions/search'] })
    qc.invalidateQueries({ queryKey: ['administrative-divisions/sections'] })
    qc.invalidateQueries({ queryKey: ['admin-division-schemes'] })
    // 점수·등급·뱃지 즉시 갱신 — 등록 직후 "새 뱃지 획득" 토스트·알림 벨이 바로 뜨도록
    invalidateGamification(qc)
  }
}

/** 행정구역 서술 섹션 (order 순) */
export function useAdministrativeDivisionSections(
  divisionId: string | undefined,
) {
  return useQuery({
    queryKey: ['administrative-divisions/sections', divisionId ?? ''],
    queryFn: async (): Promise<AdminDivisionSection[]> => {
      if (!divisionId) return []
      return await cityApi.getAdministrativeDivisionSections(divisionId)
    },
    enabled: !!divisionId,
  })
}

export function useCreateAdminDivisionConfig(ownerInput: DivisionOwnerInput) {
  const invalidate = useInvalidateForOwner(ownerInput)
  return useMutation({
    mutationFn: (input: CreateAdminDivisionConfigInput) =>
      cityApi.createAdminDivisionConfig(input),
    onSuccess: invalidate,
  })
}

export function useUpdateAdminDivisionConfig(ownerInput: DivisionOwnerInput) {
  const invalidate = useInvalidateForOwner(ownerInput)
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

export function useDeleteAdminDivisionConfig(ownerInput: DivisionOwnerInput) {
  const invalidate = useInvalidateForOwner(ownerInput)
  return useMutation({
    mutationFn: (id: string) => cityApi.deleteAdminDivisionConfig(id),
    onSuccess: invalidate,
  })
}

export function useCreateAdministrativeDivision(
  ownerInput: DivisionOwnerInput,
) {
  const invalidate = useInvalidateForOwner(ownerInput)
  return useMutation({
    mutationFn: (input: CreateAdministrativeDivisionInput) =>
      cityApi.createAdministrativeDivision(input),
    onSuccess: invalidate,
  })
}

export function useUpdateAdministrativeDivision(
  ownerInput: DivisionOwnerInput,
) {
  const invalidate = useInvalidateForOwner(ownerInput)
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
  ownerInput: DivisionOwnerInput,
) {
  const invalidate = useInvalidateForOwner(ownerInput)
  return useMutation({
    mutationFn: (id: string) => cityApi.deleteAdministrativeDivision(id),
    onSuccess: invalidate,
  })
}

export function useBulkCreateAdministrativeDivisions(
  ownerInput: DivisionOwnerInput,
) {
  const invalidate = useInvalidateForOwner(ownerInput)
  return useMutation({
    mutationFn: (input: BulkCreateAdministrativeDivisionsInput) =>
      cityApi.bulkCreateAdministrativeDivisions(input),
    onSuccess: invalidate,
  })
}

/** 행정구역 평탄 검색 — 디바운스해서 호출하는 게 좋음. schemeId로 체계 한정. */
export function useAdministrativeDivisionSearch(
  q: string,
  ownerInput: DivisionOwnerInput,
  limit = 50,
  schemeId?: string | null,
) {
  const owner = normalizeOwner(ownerInput)
  return useQuery({
    queryKey: [
      'administrative-divisions/search',
      { q, ...ownerKey(owner), limit, schemeId: schemeId ?? '' },
    ],
    queryFn: async (): Promise<AdministrativeDivisionSearchHit[]> => {
      if (!owner || q.trim().length < 1) return []
      return await cityApi.searchAdministrativeDivisions(
        q,
        owner,
        limit,
        schemeId,
      )
    },
    enabled: !!owner && q.trim().length >= 1,
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
