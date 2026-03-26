/**
 * 국가 데이터 관리 훅
 *
 * @description
 * React Query를 사용한 국가 CRUD 작업을 위한 커스텀 훅 모음
 *
 * @features
 * - useCountries: 전체 국가 목록 조회
 * - useCountry: 특정 국가 상세 조회
 * - useCreateCountry: 국가 생성
 * - useUpdateCountry: 국가 수정
 * - useDeleteCountry: 국가 삭제
 *
 * @usage
 * - pages/history/country/country.page.tsx (국가 CRUD)
 * - pages/history/continents/continents.page.tsx (대륙별 국가 통계)
 * - pages/history/person/person.page.tsx (인물 국가 선택)
 * - widgets/country/country-detail/ui/CountryDetail.tsx (국가 상세)
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import * as countriesApi from '@/shared/api/countries'
import type {
  CountryResponseDto,
  CreateCountryDto,
  UpdateCountryDto,
} from '@/shared/api/countries'

/**
 * React Query 캐시 키 관리
 *
 * @description
 * 국가 관련 쿼리의 캐시 키를 중앙 관리하여
 * 캐시 무효화 및 갱신을 일관성 있게 처리
 */
export const countryKeys = {
  all: ['countries'] as const,
  lists: () => [...countryKeys.all, 'list'] as const,
  list: (filters?: any) => [...countryKeys.lists(), filters] as const,
  details: () => [...countryKeys.all, 'detail'] as const,
  detail: (id: string) => [...countryKeys.details(), id] as const,
}

/**
 * 모든 국가 조회
 *
 * @description
 * 전체 국가 목록을 조회합니다.
 * 5분의 staleTime을 설정하여 불필요한 재조회 방지
 *
 * @returns {UseQueryResult<Country[]>} 국가 목록 쿼리 결과
 *
 * @example
 * ```tsx
 * const { data: countries, isLoading } = useCountries()
 * ```
 */
export function useCountries() {
  return useQuery({
    queryKey: countryKeys.lists(),
    queryFn: () => countriesApi.getAllCountries(),
    staleTime: 1000 * 60 * 5, // 5분
  })
}

/**
 * 국가 상세 조회
 *
 * @description
 * ID로 특정 국가의 상세 정보를 조회합니다.
 * id가 없으면 쿼리가 비활성화됩니다.
 *
 * @param {string | undefined} id - 조회할 국가 ID
 * @returns {UseQueryResult<Country>} 국가 상세 쿼리 결과
 *
 * @example
 * ```tsx
 * const { data: country } = useCountry(countryId)
 * ```
 */
export function useCountry(id: string | undefined) {
  return useQuery({
    queryKey: countryKeys.detail(id || ''),
    queryFn: () => countriesApi.getCountryById(id!),
    enabled: !!id,
    staleTime: 1000 * 60 * 5, // 5분
  })
}

/**
 * 국가 생성
 *
 * @description
 * 새로운 국가를 생성합니다.
 * 성공 시 자동으로 국가 목록 캐시를 갱신합니다.
 *
 * @returns {UseMutationResult} 국가 생성 뮤테이션 결과
 *
 * @example
 * ```tsx
 * const createMutation = useCreateCountry()
 * createMutation.mutate({ name: '대한민국', isoCode: 'KR', ... })
 * ```
 */
export function useCreateCountry() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: CreateCountryDto) => countriesApi.createCountry(data),
    onSuccess: () => {
      // 목록 갱신
      queryClient.invalidateQueries({ queryKey: countryKeys.lists() })
    },
  })
}

/**
 * 국가 수정
 *
 * @description
 * 기존 국가 정보를 수정합니다.
 * 성공 시 목록 및 해당 국가 상세 캐시를 갱신합니다.
 *
 * @returns {UseMutationResult} 국가 수정 뮤테이션 결과
 *
 * @example
 * ```tsx
 * const updateMutation = useUpdateCountry()
 * updateMutation.mutate({ id: '1', data: { name: '대한민국' } })
 * ```
 */
export function useUpdateCountry() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateCountryDto }) =>
      countriesApi.updateCountry(id, data),
    onSuccess: (updated, variables) => {
      // 무효화 전에 목록·상세 캐시를 응답으로 즉시 병합 (재조회 전에 폼을 다시 열어도 값 유지)
      queryClient.setQueryData(
        countryKeys.lists(),
        (old: CountryResponseDto[] | undefined) =>
          old?.map((c) =>
            c.id === updated.id ? { ...c, ...updated } : c,
          ),
      )
      queryClient.setQueryData(countryKeys.detail(variables.id), updated)
      queryClient.invalidateQueries({ queryKey: countryKeys.lists() })
      queryClient.invalidateQueries({
        queryKey: countryKeys.detail(variables.id),
      })
      queryClient.invalidateQueries({ queryKey: ['persons'] })
      queryClient.invalidateQueries({ queryKey: ['person-detail'] })
      queryClient.invalidateQueries({ queryKey: ['persons-by-country'] })
    },
  })
}

/**
 * 국가 삭제
 *
 * @description
 * 국가를 삭제합니다.
 * 성공 시 자동으로 국가 목록 캐시를 갱신합니다.
 *
 * @returns {UseMutationResult} 국가 삭제 뮤테이션 결과
 *
 * @example
 * ```tsx
 * const deleteMutation = useDeleteCountry()
 * deleteMutation.mutate(countryId)
 * ```
 */
export function useDeleteCountry() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => countriesApi.deleteCountry(id),
    onSuccess: () => {
      // 목록 갱신
      queryClient.invalidateQueries({ queryKey: countryKeys.lists() })
    },
  })
}
