import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { invalidateGamification } from '@/entities/gamification'
import * as historicalCountriesApi from '@/shared/api/historical-countries'
import type {
  HistoricalCountryResponseDto,
  CreateHistoricalCountryDto,
  UpdateHistoricalCountryDto,
  HistoricalStateType,
  Era,
} from '@/shared/api/historical-countries'

// SDK 타입을 그대로 사용
export type HistoricalCountry = HistoricalCountryResponseDto
export type CreateHistoricalCountryData = CreateHistoricalCountryDto
export type UpdateHistoricalCountryData = UpdateHistoricalCountryDto

// Enum 타입도 re-export
export type { HistoricalStateType, Era }

/** 정치체 성격 (주권 국가 / 정권 / 시대). API 응답에 있으면 사용 */
export type HistoricalEntityKind = 'STATE' | 'REGIME' | 'PERIOD'

/**
 * 역사적 국가 필터
 */
export interface HistoricalCountryFilter {
  searchTerm: string
  selectedStateType: HistoricalStateType | 'ALL'
  selectedCentury: string
}

/**
 * Historical Country API 쿼리 키
 */
export const historicalCountryKeys = {
  all: ['historical-countries'] as const,
  detail: (id: string) => ['historical-countries', id] as const,
}

/**
 * 모든 역사적 국가 목록 조회 훅
 */
export function useHistoricalCountries() {
  return useQuery({
    queryKey: historicalCountryKeys.all,
    queryFn: async () => {
      const response = await historicalCountriesApi.getAllHistoricalCountries()
      return response as HistoricalCountry[]
    },
  })
}

/**
 * ID로 역사적 국가 조회 훅
 */
export function useHistoricalCountry(id: string) {
  return useQuery({
    queryKey: historicalCountryKeys.detail(id),
    queryFn: async () => {
      const response = await historicalCountriesApi.getHistoricalCountryById(id)
      return response as HistoricalCountry
    },
    enabled: !!id,
  })
}

/**
 * 역사적 국가 생성 뮤테이션 훅
 */
export function useCreateHistoricalCountry() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: CreateHistoricalCountryData) => {
      const response =
        await historicalCountriesApi.createHistoricalCountry(data)
      return response as HistoricalCountry
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: historicalCountryKeys.all })
      // 모던 국가 응답에 historicalCountries가 임베드되어 함께 갱신
      queryClient.invalidateQueries({ queryKey: ['countries'] })
      invalidateGamification(queryClient)
    },
  })
}

/**
 * 역사적 국가 수정 뮤테이션 훅
 */
export function useUpdateHistoricalCountry() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string
      data: UpdateHistoricalCountryData
    }) => {
      const response = await historicalCountriesApi.updateHistoricalCountry(
        id,
        data,
      )
      return response as HistoricalCountry
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: historicalCountryKeys.all })
      queryClient.invalidateQueries({
        queryKey: historicalCountryKeys.detail(variables.id),
      })
      // 모던 국가 응답에 historicalCountries가 임베드되어 함께 갱신
      queryClient.invalidateQueries({ queryKey: ['countries'] })
    },
  })
}

/**
 * 역사적 국가 삭제 뮤테이션 훅
 */
export function useDeleteHistoricalCountry() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      await historicalCountriesApi.deleteHistoricalCountry(id)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: historicalCountryKeys.all })
      // 모던 국가 응답에 historicalCountries가 임베드되어 함께 갱신
      queryClient.invalidateQueries({ queryKey: ['countries'] })
    },
  })
}
