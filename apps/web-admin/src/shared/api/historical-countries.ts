/**
 * 역사적 국가 API 서비스
 * Nestia SDK를 사용한 타입 안전한 역사적 국가 CRUD
 */

import * as historicalCountriesApi from '@api/functional/historical_countries'
import { apiConnection } from './client'

// SDK에서 생성된 타입 사용
export type HistoricalCountryResponseDto = Awaited<
  ReturnType<typeof historicalCountriesApi.getAllHistoricalCountries>
>[number]
export type CreateHistoricalCountryDto = Parameters<
  typeof historicalCountriesApi.createHistoricalCountry
>[1]
export type UpdateHistoricalCountryDto = Parameters<
  typeof historicalCountriesApi.updateHistoricalCountry
>[2]

// HistoricalStateType 추출 (HistoricalCountryResponseDto에서)
export type HistoricalStateType = NonNullable<
  HistoricalCountryResponseDto['stateType']
>

// Era 타입 추출 (HistoricalCountryResponseDto에서)
export type Era = NonNullable<HistoricalCountryResponseDto['startEra']>

/**
 * 모든 역사적 국가 조회
 */
export async function getAllHistoricalCountries(): Promise<
  HistoricalCountryResponseDto[]
> {
  try {
    const response = (await historicalCountriesApi.getAllHistoricalCountries(
      apiConnection,
    )) as any
    // TransformInterceptor로 래핑된 응답에서 data 추출
    return response.data || response
  } catch (error) {
    console.error('❌ 역사적 국가 목록 조회 실패:', error)
    throw error
  }
}

/**
 * 역사적 국가 상세 조회
 */
export async function getHistoricalCountryById(
  id: string,
): Promise<HistoricalCountryResponseDto> {
  try {
    const response = (await historicalCountriesApi.getHistoricalCountryById(
      apiConnection,
      id,
    )) as any
    return response.data || response
  } catch (error) {
    console.error(`❌ 역사적 국가 조회 실패 (ID: ${id}):`, error)
    throw error
  }
}

/**
 * 역사적 국가 생성
 */
export async function createHistoricalCountry(
  data: CreateHistoricalCountryDto,
): Promise<HistoricalCountryResponseDto> {
  try {
    const response = (await historicalCountriesApi.createHistoricalCountry(
      apiConnection,
      data,
    )) as any
    return response.data || response
  } catch (error) {
    console.error('❌ 역사적 국가 생성 실패:', error)
    throw error
  }
}

/**
 * 역사적 국가 수정
 */
export async function updateHistoricalCountry(
  id: string,
  data: UpdateHistoricalCountryDto,
): Promise<HistoricalCountryResponseDto> {
  try {
    const response = (await historicalCountriesApi.updateHistoricalCountry(
      apiConnection,
      id,
      data,
    )) as any
    return response.data || response
  } catch (error) {
    console.error(`❌ 역사적 국가 수정 실패 (ID: ${id}):`, error)
    throw error
  }
}

/**
 * 역사적 국가 삭제
 */
export async function deleteHistoricalCountry(id: string): Promise<void> {
  try {
    await historicalCountriesApi.deleteHistoricalCountry(apiConnection, id)
  } catch (error) {
    console.error(`❌ 역사적 국가 삭제 실패 (ID: ${id}):`, error)
    throw error
  }
}
