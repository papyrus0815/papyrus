import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { invalidateGamification } from '@/entities/gamification'
import * as personsApi from '@/shared/api/persons'
import type {
  PersonResponseDto,
  PersonInfographicItemDto,
  CreatePersonDto,
  UpdatePersonDto,
  Era,
} from '@/shared/api/persons'

// SDK 타입을 그대로 사용
export type Person = PersonResponseDto
/** 인포그래픽 목록(경량) 아이템 — adapt가 쓰는 최소 필드만 */
export type PersonInfographicItem = PersonInfographicItemDto
export type CreatePersonData = CreatePersonDto
export type UpdatePersonData = UpdatePersonDto
export type { Era }

/**
 * Person API 쿼리 키
 */
export const personKeys = {
  all: ['persons'] as const,
  /** GET /persons/infographic (경량 목록) — ['persons'] 프리픽스라 all 무효화 시 함께 갱신됨 */
  infographic: ['persons', 'infographic'] as const,
  /** GET /persons/:id (요약) */
  detail: (id: string) => ['persons', id] as const,
  /** GET /persons/:id/detail (관계·재임 등 포함 상세) */
  detailFull: (id: string) => ['person-detail', id] as const,
  /** GET /persons/dashboard/person-counts-by-modern-country */
  modernCountryPersonCounts: ['persons', 'modern-country-person-counts'] as const,
}

/**
 * 모든 인물 목록 조회 훅
 */
export function usePersons() {
  return useQuery({
    queryKey: personKeys.all,
    queryFn: async () => {
      const response = await personsApi.getAllPersons()
      return response as Person[]
    },
    // 전량(+무거운 include) 로드라 마운트마다 재페치하면 비쌈.
    // 카드→상세→뒤로 네비게이션 동안 캐시 재사용. mutation invalidate로 갱신은 그대로 동작.
    staleTime: 60_000,
  })
}

/**
 * 인포그래픽 목록(경량) 조회 훅 — 대시보드 인포그래픽 전용.
 * usePersons(전체 payload)와 별도 캐시. 키가 ['persons'] 프리픽스라
 * 인물 생성/수정/삭제의 personKeys.all 무효화로 함께 갱신된다.
 */
export function usePersonsInfographic() {
  return useQuery({
    queryKey: personKeys.infographic,
    queryFn: () => personsApi.getInfographicPersons(),
    staleTime: 60_000,
  })
}

/**
 * 현대 국가별 연결 인물 수 (대시보드 통계)
 */
export function useModernCountryPersonCounts(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: personKeys.modernCountryPersonCounts,
    queryFn: () => personsApi.getModernCountryPersonCounts(),
    staleTime: 60_000,
    enabled: options?.enabled ?? true,
  })
}

/**
 * ID로 인물 조회 훅
 */
export function usePerson(id: string) {
  return useQuery({
    queryKey: personKeys.detail(id),
    queryFn: async () => {
      const response = await personsApi.getPersonById(id)
      return response as Person
    },
    enabled: !!id,
  })
}

/**
 * 인물 생성 뮤테이션 훅
 */
export function useCreatePerson() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: CreatePersonData) => {
      const response = await personsApi.createPerson(data)
      return response as Person
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: personKeys.all })
      queryClient.invalidateQueries({
        queryKey: personKeys.modernCountryPersonCounts,
      })
      invalidateGamification(queryClient)
    },
  })
}

/**
 * 인물 수정 뮤테이션 훅
 */
export function useUpdatePerson() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string
      data: UpdatePersonData
    }) => {
      const response = await personsApi.updatePerson(id, data)
      return response as Person
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: personKeys.all })
      queryClient.invalidateQueries({
        queryKey: personKeys.modernCountryPersonCounts,
      })
      queryClient.invalidateQueries({
        queryKey: personKeys.detail(variables.id),
      })
      queryClient.invalidateQueries({
        queryKey: personKeys.detailFull(variables.id),
      })
    },
  })
}

/**
 * 인物 삭제 뮤테이션 훅
 */
export function useDeletePerson() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      await personsApi.deletePerson(id)
    },
    onSuccess: (_void, deletedId) => {
      queryClient.invalidateQueries({ queryKey: personKeys.all })
      queryClient.invalidateQueries({
        queryKey: personKeys.modernCountryPersonCounts,
      })
      queryClient.invalidateQueries({
        queryKey: personKeys.detailFull(deletedId),
      })
    },
  })
}
