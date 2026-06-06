/**
 * 역사적 국가 데이터 관리 훅
 *
 * @description
 * React Query를 사용한 역사적 국가 CRUD 작업을 위한 커스텀 훅 모음
 *
 * @features
 * - useHistoricalCountries: 전체 역사적 국가 목록 조회
 * - useHistoricalCountry: 특정 역사적 국가 상세 조회
 * - useCreateHistoricalCountry: 역사적 국가 생성
 * - useUpdateHistoricalCountry: 역사적 국가 수정
 * - useDeleteHistoricalCountry: 역사적 국가 삭제
 *
 * @usage
 * - pages/history/country/country.page.tsx (역사적 국가 CRUD)
 * - pages/history/historical-country/historical-country.page.tsx (역사적 국가 전용 페이지)
 */

import {
  useQuery,
  useMutation,
  useQueryClient,
  type QueryClient,
} from '@tanstack/react-query'
import { onContentRegistered } from '@/entities/gamification'
import * as historicalCountriesApi from '@/shared/api/historical-countries'
import type {
  CreateHistoricalCountryDto,
  UpdateHistoricalCountryDto,
} from '@/shared/api/historical-countries'
import { countryKeys } from '@/features/country/api'

/** `useHistoricalCountriesByModernCountry` — GET /countries/:id/historical-countries 캐시 */
function invalidateLinkedHistoricalByModernCountry(queryClient: QueryClient) {
  queryClient.invalidateQueries({
    predicate: (query) => {
      const k = query.queryKey
      return (
        Array.isArray(k) &&
        k.length === 3 &&
        k[0] === 'countries' &&
        typeof k[1] === 'string' &&
        k[2] === 'historical-countries'
      )
    },
  })
}

/**
 * React Query 캐시 키 관리
 *
 * @description
 * 역사적 국가 관련 쿼리의 캐시 키를 중앙 관리하여
 * 캐시 무효화 및 갱신을 일관성 있게 처리
 */
export const historicalCountryKeys = {
  all: ['historical-countries'] as const,
  lists: () => [...historicalCountryKeys.all, 'list'] as const,
  list: (filters?: any) => [...historicalCountryKeys.lists(), filters] as const,
  details: () => [...historicalCountryKeys.all, 'detail'] as const,
  detail: (id: string) => [...historicalCountryKeys.details(), id] as const,
}

/**
 * 모든 역사적 국가 조회
 *
 * @description
 * 전체 역사적 국가 목록을 조회합니다.
 * 예: 조선, 고려, 로마 제국, 오스만 제국 등
 *
 * @returns {UseQueryResult<HistoricalCountry[]>} 역사적 국가 목록 쿼리 결과
 *
 * @example
 * ```tsx
 * const { data: historicalCountries, isLoading } = useHistoricalCountries()
 * ```
 */
export function useHistoricalCountries() {
  return useQuery({
    queryKey: historicalCountryKeys.lists(),
    queryFn: () => historicalCountriesApi.getAllHistoricalCountries(),
    staleTime: 1000 * 60 * 5, // 5분
  })
}

/**
 * 역사적 국가 상세 조회
 *
 * @description
 * ID로 특정 역사적 국가의 상세 정보를 조회합니다.
 * id가 없으면 쿼리가 비활성화됩니다.
 *
 * @param {string | undefined} id - 조회할 역사적 국가 ID
 * @returns {UseQueryResult<HistoricalCountry>} 역사적 국가 상세 쿼리 결과
 *
 * @example
 * ```tsx
 * const { data: historicalCountry } = useHistoricalCountry(countryId)
 * ```
 */
export function useHistoricalCountry(id: string | undefined) {
  return useQuery({
    queryKey: historicalCountryKeys.detail(id || ''),
    queryFn: () => historicalCountriesApi.getHistoricalCountryById(id!),
    enabled: !!id,
    staleTime: 1000 * 60 * 5, // 5분
  })
}

/**
 * 역사적 국가 생성
 *
 * @description
 * 새로운 역사적 국가를 생성합니다.
 * 성공 시 자동으로 역사적 국가 목록 캐시를 갱신합니다.
 *
 * @returns {UseMutationResult} 역사적 국가 생성 뮤테이션 결과
 *
 * @example
 * ```tsx
 * const createMutation = useCreateHistoricalCountry()
 * createMutation.mutate({ name: '조선', enName: 'Joseon', ... })
 * ```
 */
export function useCreateHistoricalCountry() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: CreateHistoricalCountryDto) =>
      historicalCountriesApi.createHistoricalCountry(data),
    onSuccess: (created) => {
      // 역사적 국가 목록 갱신 (전체 prefix로 entities/features 모두 반영)
      queryClient.invalidateQueries({
        queryKey: historicalCountryKeys.all,
      })
      // 연대표 페이지의 현대 국가 목록(역사적 국가 중첩) 갱신
      queryClient.invalidateQueries({ queryKey: countryKeys.lists() })
      invalidateLinkedHistoricalByModernCountry(queryClient)
      // 게이미피케이션 즉시 갱신 + 완성도 보너스 피드백 (썸네일·설명·명칭유래)
      const h = created as { thumbnailUrl?: string | null; description?: string | null; nameOrigin?: string | null }
      onContentRegistered(
        (h?.thumbnailUrl ? 1 : 0) + (h?.description ? 1 : 0) + (h?.nameOrigin ? 1 : 0),
      )
    },
  })
}

/**
 * 역사적 국가 수정
 *
 * @description
 * 기존 역사적 국가 정보를 수정합니다.
 * 성공 시 목록 및 해당 역사적 국가 상세 캐시를 갱신합니다.
 *
 * @returns {UseMutationResult} 역사적 국가 수정 뮤테이션 결과
 *
 * @example
 * ```tsx
 * const updateMutation = useUpdateHistoricalCountry()
 * updateMutation.mutate({ id: '1', data: { name: '조선왕조' } })
 * ```
 */
export function useUpdateHistoricalCountry() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string
      data: UpdateHistoricalCountryDto
    }) => historicalCountriesApi.updateHistoricalCountry(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: historicalCountryKeys.all,
      })
      queryClient.invalidateQueries({
        queryKey: historicalCountryKeys.detail(variables.id),
      })
      queryClient.invalidateQueries({ queryKey: countryKeys.lists() })
      invalidateLinkedHistoricalByModernCountry(queryClient)
    },
  })
}

/**
 * 역사적 국가 삭제
 *
 * @description
 * 역사적 국가를 삭제합니다.
 * 성공 시 자동으로 역사적 국가 목록 캐시를 갱신합니다.
 *
 * @returns {UseMutationResult} 역사적 국가 삭제 뮤테이션 결과
 *
 * @example
 * ```tsx
 * const deleteMutation = useDeleteHistoricalCountry()
 * deleteMutation.mutate(countryId)
 * ```
 */
export function useDeleteHistoricalCountry() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) =>
      historicalCountriesApi.deleteHistoricalCountry(id),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: historicalCountryKeys.all,
      })
      queryClient.invalidateQueries({ queryKey: countryKeys.lists() })
      invalidateLinkedHistoricalByModernCountry(queryClient)
    },
  })
}
