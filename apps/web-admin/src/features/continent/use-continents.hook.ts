/**
 * 대륙 데이터 관리 훅
 *
 * @description
 * React Query를 사용한 대륙 CRUD 작업을 위한 커스텀 훅 모음
 *
 * @features
 * - useContinents: 전체 대륙 목록 조회
 * - useContinent: 특정 대륙 상세 조회
 * - useCreateContinent: 대륙 생성
 * - useUpdateContinent: 대륙 수정
 * - useDeleteContinent: 대륙 삭제
 *
 * @usage
 * - pages/history/country/country.page.tsx (대륙 필터용)
 * - pages/history/continents/continents.page.tsx (대륙 CRUD)
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import * as continentsApi from '@/shared/api/continents'
import type {
  CreateContinentDto,
  UpdateContinentDto,
} from '@/shared/api/continents'

/**
 * React Query 캐시 키 관리
 *
 * @description
 * 대륙 관련 쿼리의 캐시 키를 중앙 관리하여
 * 캐시 무효화 및 갱신을 일관성 있게 처리
 */
export const continentKeys = {
  all: ['continents'] as const,
  lists: () => [...continentKeys.all, 'list'] as const,
  list: (filters?: any) => [...continentKeys.lists(), filters] as const,
  details: () => [...continentKeys.all, 'detail'] as const,
  detail: (id: string) => [...continentKeys.details(), id] as const,
}

/**
 * 모든 대륙 조회
 *
 * @description
 * 전체 대륙 목록을 조회합니다.
 * 대륙 데이터는 변경이 거의 없으므로 10분의 staleTime을 설정
 *
 * @returns {UseQueryResult<Continent[]>} 대륙 목록 쿼리 결과
 *
 * @example
 * ```tsx
 * const { data: continents, isLoading } = useContinents()
 * ```
 */
export function useContinents() {
  return useQuery({
    queryKey: continentKeys.lists(),
    queryFn: () => continentsApi.getAllContinents(),
    staleTime: 1000 * 60 * 10, // 10분 (대륙은 잘 변하지 않음)
  })
}

/**
 * 대륙 상세 조회
 *
 * @description
 * ID로 특정 대륙의 상세 정보를 조회합니다.
 * id가 없으면 쿼리가 비활성화됩니다.
 *
 * @param {string | undefined} id - 조회할 대륙 ID
 * @returns {UseQueryResult<Continent>} 대륙 상세 쿼리 결과
 *
 * @example
 * ```tsx
 * const { data: continent } = useContinent(continentId)
 * ```
 */
export function useContinent(id: string | undefined) {
  return useQuery({
    queryKey: continentKeys.detail(id || ''),
    queryFn: () => continentsApi.getContinentById(id!),
    enabled: !!id,
    staleTime: 1000 * 60 * 10, // 10분
  })
}

/**
 * 대륙 생성
 *
 * @description
 * 새로운 대륙을 생성합니다.
 * 성공 시 자동으로 대륙 목록 캐시를 갱신합니다.
 *
 * @returns {UseMutationResult} 대륙 생성 뮤테이션 결과
 *
 * @example
 * ```tsx
 * const createMutation = useCreateContinent()
 * createMutation.mutate({ name: '아시아', enName: 'Asia', ... })
 * ```
 */
export function useCreateContinent() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: CreateContinentDto) =>
      continentsApi.createContinent(data),
    onSuccess: () => {
      // 목록 갱신
      queryClient.invalidateQueries({ queryKey: continentKeys.lists() })
    },
  })
}

/**
 * 대륙 수정
 *
 * @description
 * 기존 대륙 정보를 수정합니다.
 * 성공 시 목록 및 해당 대륙 상세 캐시를 갱신합니다.
 *
 * @returns {UseMutationResult} 대륙 수정 뮤테이션 결과
 *
 * @example
 * ```tsx
 * const updateMutation = useUpdateContinent()
 * updateMutation.mutate({ id: '1', data: { name: '유럽' } })
 * ```
 */
export function useUpdateContinent() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateContinentDto }) =>
      continentsApi.updateContinent(id, data),
    onSuccess: (_, variables) => {
      // 목록 갱신
      queryClient.invalidateQueries({ queryKey: continentKeys.lists() })
      // 상세 갱신
      queryClient.invalidateQueries({
        queryKey: continentKeys.detail(variables.id),
      })
    },
  })
}

/**
 * 대륙 삭제
 *
 * @description
 * 대륙을 삭제합니다.
 * 성공 시 자동으로 대륙 목록 캐시를 갱신합니다.
 *
 * @returns {UseMutationResult} 대륙 삭제 뮤테이션 결과
 *
 * @example
 * ```tsx
 * const deleteMutation = useDeleteContinent()
 * deleteMutation.mutate(continentId)
 * ```
 */
export function useDeleteContinent() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => continentsApi.deleteContinent(id),
    onSuccess: () => {
      // 목록 갱신
      queryClient.invalidateQueries({ queryKey: continentKeys.lists() })
    },
  })
}
