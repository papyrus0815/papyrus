/**
 * 인물 API 서비스
 * Nestia SDK를 사용한 타입 안전한 인물 CRUD
 */
import * as personsApi from '@api/functional/persons'

import { apiConnection } from './client'

// SDK에서 생성된 타입 사용
export type PersonResponseDto = Awaited<
  ReturnType<typeof personsApi.getAll>
>[number]
export type CreatePersonDto = Parameters<typeof personsApi.create>[1]
export type UpdatePersonDto = Parameters<typeof personsApi.update>[2]

// Era 타입 추출 (CreatePersonDto에서)
export type Era = NonNullable<CreatePersonDto['birthEra']>

/**
 * 모든 인물 조회
 */
export async function getAllPersons(): Promise<PersonResponseDto[]> {
  try {
    const response = (await personsApi.getAll(apiConnection)) as any
    // TransformInterceptor로 래핑된 응답에서 data 추출
    return response.data || response
  } catch (error) {
    console.error('❌ 인물 목록 조회 실패:', error)
    throw error
  }
}

/**
 * 인물 상세 조회
 */
export async function getPersonById(id: string): Promise<PersonResponseDto> {
  try {
    const response = (await personsApi.getById(apiConnection, id)) as any
    return response.data || response
  } catch (error) {
    console.error(`❌ 인물 조회 실패 (ID: ${id}):`, error)
    throw error
  }
}

/**
 * 인물 생성
 */
export async function createPerson(
  data: CreatePersonDto,
): Promise<PersonResponseDto> {
  try {
    const response = (await personsApi.create(apiConnection, data)) as any
    return response.data || response
  } catch (error) {
    console.error('❌ 인물 생성 실패:', error)
    throw error
  }
}

/**
 * 인물 수정
 */
export async function updatePerson(
  id: string,
  data: UpdatePersonDto,
): Promise<PersonResponseDto> {
  try {
    const response = (await personsApi.update(apiConnection, id, data)) as any
    return response.data || response
  } catch (error) {
    console.error(`❌ 인물 수정 실패 (ID: ${id}):`, error)
    throw error
  }
}

/**
 * 인물 삭제
 */
export async function deletePerson(id: string): Promise<void> {
  try {
    await personsApi._delete(apiConnection, id)
  } catch (error) {
    console.error(`❌ 인물 삭제 실패 (ID: ${id}):`, error)
    throw error
  }
}

/**
 * 모든 인물 조회 (정부 직책 포함)
 */
export async function getAllPersonsWithGovernmentPositions(): Promise<any[]> {
  try {
    const response = await fetch(
      `${apiConnection.host}/persons/with-government-positions`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      },
    )

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }

    const data = await response.json()
    return data.data || data
  } catch (error) {
    console.error('❌ 인물 목록 조회 실패 (정부 직책 포함):', error)
    throw error
  }
}
