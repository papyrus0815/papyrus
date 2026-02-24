/**
 * 인물 API 서비스
 * Nestia SDK를 사용한 타입 안전한 인물 CRUD
 */
import * as personsApi from '@api/functional/persons'

import { apiConnection, getApiConnection } from './client'

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
    const response = (await personsApi.getAll(getApiConnection())) as any
    return response.data || response
  } catch (error) {
    throw error
  }
}

/**
 * 해당 국가(또는 연결된 역사적 국가)에 재임 기록이 있는 인물만 조회 (REST)
 * GET /government-positions/countries/:countryId/persons
 * GET /government-positions/historical-countries/:historicalCountryId/persons
 */
export async function getPersonsByTenureCountry(params: {
  countryId?: string
  historicalCountryId?: string
}): Promise<PersonResponseDto[]> {
  const { countryId, historicalCountryId } = params
  if (!countryId && !historicalCountryId) return []
  const path = countryId
    ? `/government-positions/countries/${encodeURIComponent(countryId)}/persons`
    : `/government-positions/historical-countries/${encodeURIComponent(historicalCountryId!)}/persons`
  const url = `${apiConnection.host}${path}`
  const conn = getApiConnection()
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(conn.headers?.Authorization && {
          Authorization: conn.headers.Authorization,
        }),
      },
      credentials: 'include',
    })
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    const data = await response.json()
    return data?.data ?? data ?? []
  } catch (error) {
    throw error
  }
}

/**
 * 인물 상세 조회
 */
export async function getPersonById(id: string): Promise<PersonResponseDto> {
  try {
    const response = (await personsApi.getById(getApiConnection(), id)) as any
    return response.data || response
  } catch (error) {
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
    const response = (await personsApi.create(getApiConnection(), data)) as any
    return response.data || response
  } catch (error) {
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
    const response = (await personsApi.update(getApiConnection(), id, data)) as any
    return response.data || response
  } catch (error) {
    throw error
  }
}

/**
 * 인물 삭제
 */
export async function deletePerson(id: string): Promise<void> {
  try {
    await personsApi._delete(getApiConnection(), id)
  } catch (error) {
    throw error
  }
}

/**
 * 모든 인물 조회 (정부 직책 포함)
 */
export async function getAllPersonsWithGovernmentPositions(): Promise<any[]> {
  try {
    const conn = getApiConnection()
    const response = await fetch(
      `${apiConnection.host}/persons/with-government-positions`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(conn.headers?.Authorization && {
            Authorization: conn.headers.Authorization,
          }),
        },
      },
    )

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }

    const data = await response.json()
    return data.data || data
  } catch (error) {
    throw error
  }
}
