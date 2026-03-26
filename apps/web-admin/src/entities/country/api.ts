import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import * as countriesApi from '@/shared/api/countries'
import type {
  CountryResponseDto,
  CreateCountryDto,
  UpdateCountryDto,
} from '@/shared/api/countries'

// SDK 타입을 그대로 사용
export type Country = CountryResponseDto
export type CreateCountryData = CreateCountryDto
export type UpdateCountryData = UpdateCountryDto

/**
 * 대륙 옵션 (UI용)
 */
export interface ContinentOption {
  id: string
  name: string
}

// schema.ts에서 CountryFormData re-export
export type { CountryFormData } from './model/schema'

/**
 * Country API 쿼리 키
 */
export const countryKeys = {
  all: ['countries'] as const,
  detail: (id: string) => ['countries', id] as const,
}

/**
 * 모든 국가 목록 조회 훅
 */
export function useCountries() {
  return useQuery({
    queryKey: countryKeys.all,
    queryFn: async () => {
      const response = await countriesApi.getAllCountries()
      return response as Country[]
    },
  })
}

/**
 * ID로 국가 조회 훅
 */
export function useCountry(id: string) {
  return useQuery({
    queryKey: countryKeys.detail(id),
    queryFn: async () => {
      const response = await countriesApi.getCountryById(id)
      return response as Country
    },
    enabled: !!id,
  })
}

/**
 * 국가 생성 뮤테이션 훅
 */
export function useCreateCountry() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: CreateCountryData) => {
      const response = await countriesApi.createCountry(data)
      return response as Country
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: countryKeys.all })
    },
  })
}

/**
 * 국가 수정 뮤테이션 훅
 */
export function useUpdateCountry() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string
      data: UpdateCountryData
    }) => {
      const response = await countriesApi.updateCountry(id, data)
      return response as Country
    },
    onSuccess: (updated, variables) => {
      queryClient.setQueryData(
        countryKeys.all,
        (old: Country[] | undefined) =>
          old?.map((c) =>
            c.id === updated.id ? { ...c, ...updated } : c,
          ),
      )
      queryClient.setQueryData(countryKeys.detail(variables.id), updated)
      queryClient.invalidateQueries({ queryKey: countryKeys.all })
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
 * 국가 삭제 뮤테이션 훅
 */
export function useDeleteCountry() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      await countriesApi.deleteCountry(id)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: countryKeys.all })
    },
  })
}
