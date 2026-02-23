/**
 * 국가 API 서비스
 * Nestia SDK를 사용한 타입 안전한 국가 CRUD
 */

import * as countriesApi from '@api/functional/countries'
import { apiConnection } from './client'

// SDK에서 생성된 타입 사용
export type CountryResponseDto = Awaited<
  ReturnType<typeof countriesApi.getAllCountries>
>[number]
export type CreateCountryDto = Parameters<typeof countriesApi.createCountry>[1]
export type UpdateCountryDto = Parameters<typeof countriesApi.updateCountry>[2]

/**
 * 모든 국가 조회
 */
export async function getAllCountries(): Promise<CountryResponseDto[]> {
  try {
    const response = (await countriesApi.getAllCountries(apiConnection)) as any
    // TransformInterceptor로 래핑된 응답에서 data 추출
    return response.data || response
  } catch (error) {
    throw error
  }
}

/**
 * 국가 상세 조회
 */
export async function getCountryById(id: string): Promise<CountryResponseDto> {
  try {
    const response = (await countriesApi.getCountryById(
      apiConnection,
      id,
    )) as any
    return response.data || response
  } catch (error) {
    throw error
  }
}

/**
 * 국가 생성
 */
export async function createCountry(
  data: CreateCountryDto,
): Promise<CountryResponseDto> {
  try {
    const response = (await countriesApi.createCountry(
      apiConnection,
      data,
    )) as any
    return response.data || response
  } catch (error) {
    throw error
  }
}

/**
 * 국가 수정
 */
export async function updateCountry(
  id: string,
  data: UpdateCountryDto,
): Promise<CountryResponseDto> {
  try {
    const response = (await countriesApi.updateCountry(
      apiConnection,
      id,
      data,
    )) as any
    return response.data || response
  } catch (error) {
    throw error
  }
}

/**
 * 국가 삭제
 */
export async function deleteCountry(id: string): Promise<void> {
  try {
    await countriesApi.deleteCountry(apiConnection, id)
  } catch (error) {
    throw error
  }
}
