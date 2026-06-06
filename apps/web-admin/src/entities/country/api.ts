import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { invalidateGamification } from '@/entities/gamification'
import * as countriesApi from '@/shared/api/countries'
import type {
  CountryResponseDto,
  CreateCountryDto,
  UpdateCountryDto,
} from '@/shared/api/countries'

// SDK 타입을 그대로 사용.
// 단, 생성된 SDK(CountryResponseDto)가 일부 신규 응답 필드를 아직 반영하지 못해 보강한다.
// (백엔드 country.response.ts에는 존재 — SDK 재생성 시 교집합 제거 가능)
export type Country = CountryResponseDto & {
  fullName?: string | null
  defaultNameDisplayOrder?: 'korean' | 'western' | null
}
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

/** 국가는 자주 바뀌지 않는 참조 데이터 — 마운트마다 재조회 방지. */
const COUNTRY_STALE_TIME = 1000 * 60 * 5 // 5분
const COUNTRY_GC_TIME = 1000 * 60 * 30 // 30분

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
    staleTime: COUNTRY_STALE_TIME,
    gcTime: COUNTRY_GC_TIME,
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
    staleTime: COUNTRY_STALE_TIME,
    gcTime: COUNTRY_GC_TIME,
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
      invalidateGamification(queryClient)
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
