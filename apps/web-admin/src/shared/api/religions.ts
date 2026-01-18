/**
 * 종교 API 서비스
 * Nestia SDK를 사용한 타입 안전한 종교 CRUD
 */

import * as religionsApi from '@api/functional/religions'
import { apiConnection } from './client'

// SDK에서 생성된 타입 사용
export type ReligionResponseDto = Awaited<
  ReturnType<typeof religionsApi.getAll>
>[number]
export type CreateReligionDto = Parameters<typeof religionsApi.create>[1]
export type UpdateReligionDto = Parameters<typeof religionsApi.update>[2]

/**
 * 모든 종교 조회
 */
export async function getAllReligions(): Promise<ReligionResponseDto[]> {
  try {
    const response = (await religionsApi.getAll(apiConnection)) as any
    // TransformInterceptor로 래핑된 응답에서 data 추출
    return response.data || response
  } catch (error) {
    console.error('❌ 종교 목록 조회 실패:', error)
    throw error
  }
}

/**
 * 종교 상세 조회
 */
export async function getReligionById(id: string): Promise<ReligionResponseDto> {
  try {
    const response = (await religionsApi.getById(apiConnection, id)) as any
    return response.data || response
  } catch (error) {
    console.error(`❌ 종교 조회 실패 (ID: ${id}):`, error)
    throw error
  }
}

/**
 * 종교 생성
 */
export async function createReligion(
  data: CreateReligionDto,
): Promise<ReligionResponseDto> {
  try {
    const response = (await religionsApi.create(apiConnection, data)) as any
    return response.data || response
  } catch (error) {
    console.error('❌ 종교 생성 실패:', error)
    throw error
  }
}

/**
 * 종교 수정
 */
export async function updateReligion(
  id: string,
  data: UpdateReligionDto,
): Promise<ReligionResponseDto> {
  try {
    const response = (await religionsApi.update(
      apiConnection,
      id,
      data,
    )) as any
    return response.data || response
  } catch (error) {
    console.error(`❌ 종교 수정 실패 (ID: ${id}):`, error)
    throw error
  }
}

/**
 * 종교 삭제
 */
export async function deleteReligion(id: string): Promise<void> {
  try {
    await religionsApi.$delete(apiConnection, id)
  } catch (error) {
    console.error(`❌ 종교 삭제 실패 (ID: ${id}):`, error)
    throw error
  }
}
