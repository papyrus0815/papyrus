/**
 * 인물 API 서비스
 * Nestia SDK를 사용한 타입 안전한 인물 CRUD
 */
import * as governmentPositions from '@api/functional/government_positions'
import * as personsApi from '@api/functional/persons'

import { getApiConnection } from './client'

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
 * 해당 국가(또는 연결된 역사적 국가)에 재임 기록이 있는 인물만 조회 (SDK)
 */
export async function getPersonsByTenureCountry(params: {
  countryId?: string
  historicalCountryId?: string
}): Promise<PersonResponseDto[]> {
  const { countryId, historicalCountryId } = params
  if (!countryId && !historicalCountryId) return []
  const conn = getApiConnection()
  try {
    if (countryId) {
      const data =
        await governmentPositions.countries.persons.getPersonsByCountryId(
          conn,
          countryId,
        )
      return Array.isArray(data) ? data : []
    }
    const data =
      await governmentPositions.historical_countries.persons.getPersonsByHistoricalCountryId(
        conn,
        historicalCountryId!,
      )
    return Array.isArray(data) ? data : []
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
    const response = (await personsApi.update(
      getApiConnection(),
      id,
      data,
    )) as any
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
 * 모든 인물 조회 (정부 직책 포함) — SDK
 */
export async function getAllPersonsWithGovernmentPositions(): Promise<any[]> {
  try {
    const conn = getApiConnection()
    const data =
      await personsApi.with_government_positions.getAllWithGovernmentPositions(
        conn,
      )
    return Array.isArray(data) ? data : []
  } catch (error) {
    throw error
  }
}

export type ModernCountryPersonCountRow = {
  countryId: string
  count: number
}

async function personsRequestJson<T>(path: string): Promise<T> {
  const conn = getApiConnection()
  const base = conn.host.replace(/\/$/, '')
  const url = `${base}${path.startsWith('/') ? path : `/${path}`}`
  const headers = new Headers()
  headers.set('Content-Type', 'application/json')
  if (conn.headers) {
    for (const [headerKey, headerValue] of Object.entries(conn.headers)) {
      if (headerValue != null && headerValue !== '')
        headers.set(headerKey, String(headerValue))
    }
  }
  const fetchFn = conn.fetch ?? fetch
  const res = await fetchFn(url, {
    method: 'GET',
    headers,
    credentials: conn.options?.credentials ?? 'include',
  })
  if (!res.ok) {
    let msg = res.statusText
    try {
      const body = await res.text()
      if (body) msg = body
    } catch {
      /* ignore */
    }
    throw new Error(msg)
  }
  return res.json() as Promise<T>
}

/**
 * 대시보드용: 현대 국가별 연결 인물 수 (국가 상세「전체 인물」과 동일 합집합)
 */
export async function getModernCountryPersonCounts(): Promise<
  ModernCountryPersonCountRow[]
> {
  const data = await personsRequestJson<ModernCountryPersonCountRow[]>(
    '/persons/dashboard/person-counts-by-modern-country',
  )
  return Array.isArray(data) ? data : []
}
