/**
 * 대륙 API 서비스
 * Nestia SDK를 사용한 타입 안전한 대륙 CRUD
 */

import * as continentsApi from '@api/functional/continents'
import { apiConnection } from './client'

// SDK에서 생성된 타입 사용
export type ContinentResponseDto = Awaited<
  ReturnType<typeof continentsApi.getAllContinents>
>[number]
export type CreateContinentDto = Parameters<
  typeof continentsApi.createContinent
>[1]
export type UpdateContinentDto = Parameters<
  typeof continentsApi.updateContinent
>[2]

/**
 * 모든 대륙 조회
 */
export async function getAllContinents(): Promise<ContinentResponseDto[]> {
  try {
    const response = (await continentsApi.getAllContinents(
      apiConnection,
    )) as any
    // TransformInterceptor로 래핑된 응답에서 data 추출
    return response.data || response
  } catch (error) {
    console.error('❌ 대륙 목록 조회 실패:', error)
    throw error
  }
}

/**
 * 대륙 상세 조회
 */
export async function getContinentById(
  id: string,
): Promise<ContinentResponseDto> {
  try {
    const response = (await continentsApi.getContinentById(
      apiConnection,
      id,
    )) as any
    return response.data || response
  } catch (error) {
    console.error(`❌ 대륙 조회 실패 (ID: ${id}):`, error)
    throw error
  }
}

/**
 * 대륙 생성
 */
export async function createContinent(
  data: CreateContinentDto,
): Promise<ContinentResponseDto> {
  try {
    const response = (await continentsApi.createContinent(
      apiConnection,
      data,
    )) as any
    return response.data || response
  } catch (error) {
    console.error('❌ 대륙 생성 실패:', error)
    throw error
  }
}

/**
 * 대륙 수정
 */
export async function updateContinent(
  id: string,
  data: UpdateContinentDto,
): Promise<ContinentResponseDto> {
  try {
    const response = (await continentsApi.updateContinent(
      apiConnection,
      id,
      data,
    )) as any
    return response.data || response
  } catch (error) {
    console.error(`❌ 대륙 수정 실패 (ID: ${id}):`, error)
    throw error
  }
}

/**
 * 대륙 삭제
 */
export async function deleteContinent(id: string): Promise<void> {
  try {
    await continentsApi.deleteContinent(apiConnection, id)
  } catch (error) {
    console.error(`❌ 대륙 삭제 실패 (ID: ${id}):`, error)
    throw error
  }
}
