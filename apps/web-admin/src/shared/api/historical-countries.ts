/**
 * 역사적 국가 API 서비스
 * Nestia SDK를 사용한 타입 안전한 역사적 국가 CRUD
 */

import * as historicalCountriesApi from '@api/functional/historical_countries'
import { getApiConnection } from './client'

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
      getApiConnection(),
    )) as any
    // TransformInterceptor로 래핑된 응답에서 data 추출
    return response.data || response
  } catch (error) {
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
      getApiConnection(),
      id,
    )) as any
    return response.data || response
  } catch (error) {
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
      getApiConnection(),
      data,
    )) as any
    return response.data || response
  } catch (error) {
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
 * 역사적 국가 삭제
 */
export async function deleteHistoricalCountry(id: string): Promise<void> {
  try {
    await historicalCountriesApi.deleteHistoricalCountry(getApiConnection(), id)
  } catch (error) {
    throw error
  }
}

// --- 계승/변천 (Transition) API (SDK 미포함 시 직접 호출)

export type TransitionEventType =
  | 'FOUNDED'
  | 'CONQUEST'
  | 'TREATY'
  | 'INDEPENDENCE'
  | 'UNIFICATION'
  | 'UNION'
  | 'DISSOLVED'
  | 'SUCCESSION'
  | 'SECULARIZATION'
  | 'SPLIT'
  | 'OTHER'

export interface HistoricalCountryTransitionDto {
  id: string
  predecessorId: string
  successorId: string
  eventType: TransitionEventType
  eventDate: string
  predecessorName?: string
  successorName?: string
  createdAt: string
  updatedAt: string
}

export interface CreateHistoricalCountryTransitionDto {
  predecessorId: string
  successorId: string
  eventType: TransitionEventType
  eventDate: string
}

export interface UpdateHistoricalCountryTransitionDto {
  eventType?: TransitionEventType
  eventDate?: string
}

/**
 * 해당 역사적 국가가 관여된 계승·변천 목록 조회
 */
export async function getTransitionsByHistoricalCountryId(
  historicalCountryId: string,
): Promise<HistoricalCountryTransitionDto[]> {
  const conn = getApiConnection()
  const path = `/historical-countries/${encodeURIComponent(historicalCountryId)}/transitions`
  const res = await fetch(`${conn.host}${path}`, {
    method: 'GET',
    headers: { ...conn.headers },
  })
  if (!res.ok) throw new Error(await res.text())
  const data = (await res.json()) as any
  return data?.data ?? data
}

/**
 * 계승/변천 관계 생성
 */
export async function createHistoricalCountryTransition(
  data: CreateHistoricalCountryTransitionDto,
): Promise<HistoricalCountryTransitionDto> {
  const conn = getApiConnection()
  const res = await fetch(`${conn.host}/historical-countries/transitions`, {
    method: 'POST',
    headers: { ...conn.headers, 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error(await res.text())
  const out = (await res.json()) as any
  return out?.data ?? out
}

/**
 * 계승/변천 관계 수정
 */
export async function updateHistoricalCountryTransition(
  transitionId: string,
  data: UpdateHistoricalCountryTransitionDto,
): Promise<HistoricalCountryTransitionDto> {
  const conn = getApiConnection()
  const path = `/historical-countries/transitions/${encodeURIComponent(transitionId)}`
  const res = await fetch(`${conn.host}${path}`, {
    method: 'PUT',
    headers: { ...conn.headers, 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error(await res.text())
  const out = (await res.json()) as any
  return out?.data ?? out
}

/**
 * 계승/변천 관계 삭제
 */
export async function deleteHistoricalCountryTransition(
  transitionId: string,
): Promise<void> {
  const conn = getApiConnection()
  const path = `/historical-countries/transitions/${encodeURIComponent(transitionId)}`
  const res = await fetch(`${conn.host}${path}`, {
    method: 'DELETE',
    headers: { ...conn.headers },
  })
  if (!res.ok) throw new Error(await res.text())
}
