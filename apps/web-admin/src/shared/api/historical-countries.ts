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

export type TransitionScope = 'STATE_SUCCESSION' | 'REGIME_CHANGE'

export interface HistoricalCountryTransitionDto {
  id: string
  predecessorId: string
  successorId: string
  eventType: TransitionEventType
  /** 전환 성격: 국가 교체 vs 정권 교체. null이면 미구분 */
  transitionScope?: TransitionScope | null
  /** 후임 국가의 존속 시작 시점 (표시용) */
  successorStartDate: string | null
  predecessorName?: string
  successorName?: string
  createdAt: string
  updatedAt: string
}

export interface CreateHistoricalCountryTransitionDto {
  predecessorId: string
  successorId: string
  eventType: TransitionEventType
  transitionScope?: TransitionScope | null
}

export interface UpdateHistoricalCountryTransitionDto {
  eventType?: TransitionEventType
  transitionScope?: TransitionScope | null
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
    credentials: 'include',
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
    credentials: 'include',
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
    credentials: 'include',
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
    credentials: 'include',
  })
  if (!res.ok) throw new Error(await res.text())
}

// --- 소속/구성 (Membership) API

export type HistoricalMembershipRole =
  | 'COLONY'
  | 'PROTECTORATE'
  | 'DOMINION'
  | 'CONFEDERATION_MEMBER'
  | 'VASSAL_STATE'
  | 'ALLY'
  | 'UNION'
  | 'SUCCESSION'
  | 'OTHER'

export interface HistoricalCountryMembershipDto {
  id: string
  historicalCountryId: string
  memberCountryId: string
  role: HistoricalMembershipRole
  isLeadingMember: boolean | null
  membershipStartDate: string | null
  membershipEndDate: string | null
  parentName?: string
  memberName?: string
  createdAt: string
  updatedAt: string
}

export interface CreateHistoricalCountryMembershipDto {
  historicalCountryId: string
  memberCountryId: string
  role: HistoricalMembershipRole
  isLeadingMember?: boolean
  membershipStartDate?: string
  membershipEndDate?: string
}

export interface UpdateHistoricalCountryMembershipDto {
  role?: HistoricalMembershipRole
  isLeadingMember?: boolean
  membershipStartDate?: string
  membershipEndDate?: string
}

export async function getMembershipsByHistoricalCountryId(
  historicalCountryId: string,
): Promise<HistoricalCountryMembershipDto[]> {
  const conn = getApiConnection()
  const path = `/historical-countries/${encodeURIComponent(historicalCountryId)}/memberships`
  const res = await fetch(`${conn.host}${path}`, {
    method: 'GET',
    headers: { ...conn.headers },
    credentials: 'include',
  })
  if (!res.ok) throw new Error(await res.text())
  const data = (await res.json()) as any
  return data?.data ?? data
}

export async function createHistoricalCountryMembership(
  data: CreateHistoricalCountryMembershipDto,
): Promise<HistoricalCountryMembershipDto> {
  const conn = getApiConnection()
  const res = await fetch(`${conn.host}/historical-countries/memberships`, {
    method: 'POST',
    headers: { ...conn.headers, 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
    credentials: 'include',
  })
  if (!res.ok) throw new Error(await res.text())
  const out = (await res.json()) as any
  return out?.data ?? out
}

export async function updateHistoricalCountryMembership(
  membershipId: string,
  data: UpdateHistoricalCountryMembershipDto,
): Promise<HistoricalCountryMembershipDto> {
  const conn = getApiConnection()
  const path = `/historical-countries/memberships/${encodeURIComponent(membershipId)}`
  const res = await fetch(`${conn.host}${path}`, {
    method: 'PUT',
    headers: { ...conn.headers, 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
    credentials: 'include',
  })
  if (!res.ok) throw new Error(await res.text())
  const out = (await res.json()) as any
  return out?.data ?? out
}

export async function deleteHistoricalCountryMembership(
  membershipId: string,
): Promise<void> {
  const conn = getApiConnection()
  const path = `/historical-countries/memberships/${encodeURIComponent(membershipId)}`
  const res = await fetch(`${conn.host}${path}`, {
    method: 'DELETE',
    headers: { ...conn.headers },
    credentials: 'include',
  })
  if (!res.ok) throw new Error(await res.text())
}

// --- 국가 관계 (Relation) API

export type HistoricalRelationType =
  | 'ALLIANCE'
  | 'WAR'
  | 'SUZERAIN_VASSAL'
  | 'TRIBUTARY'
  | 'PERSONAL_UNION'

export interface HistoricalCountryRelationDto {
  id: string
  subjectCountryId: string
  objectCountryId: string
  relationType: HistoricalRelationType
  startDate: string | null
  endDate: string | null
  subjectCountryName?: string
  objectCountryName?: string
  createdAt: string
  updatedAt: string
}

export interface CreateHistoricalCountryRelationDto {
  subjectCountryId: string
  objectCountryId: string
  relationType: HistoricalRelationType
  startDate?: string
  endDate?: string
}

export interface UpdateHistoricalCountryRelationDto {
  relationType?: HistoricalRelationType
  startDate?: string
  endDate?: string
}

export async function getRelationsByHistoricalCountryId(
  historicalCountryId: string,
): Promise<HistoricalCountryRelationDto[]> {
  const conn = getApiConnection()
  const path = `/historical-countries/${encodeURIComponent(historicalCountryId)}/relations`
  const res = await fetch(`${conn.host}${path}`, {
    method: 'GET',
    headers: { ...conn.headers },
    credentials: 'include',
  })
  if (!res.ok) throw new Error(await res.text())
  const data = (await res.json()) as any
  return data?.data ?? data
}

/** 여러 역사적 국가의 변천·소속·관계 일괄 조회 (호출 3회로 통합) */
export async function getTransitionsByHistoricalCountryIds(
  historicalCountryIds: string[],
): Promise<HistoricalCountryTransitionDto[]> {
  if (historicalCountryIds.length === 0) return []
  const conn = getApiConnection()
  const ids = historicalCountryIds.join(',')
  const res = await fetch(
    `${conn.host}/historical-countries/by-ids/transitions?ids=${encodeURIComponent(ids)}`,
    { method: 'GET', headers: { ...conn.headers }, credentials: 'include' },
  )
  if (!res.ok) throw new Error(await res.text())
  const data = (await res.json()) as any
  return data?.data ?? data
}

export async function getMembershipsByHistoricalCountryIds(
  historicalCountryIds: string[],
): Promise<HistoricalCountryMembershipDto[]> {
  if (historicalCountryIds.length === 0) return []
  const conn = getApiConnection()
  const ids = historicalCountryIds.join(',')
  const res = await fetch(
    `${conn.host}/historical-countries/by-ids/memberships?ids=${encodeURIComponent(ids)}`,
    { method: 'GET', headers: { ...conn.headers }, credentials: 'include' },
  )
  if (!res.ok) throw new Error(await res.text())
  const data = (await res.json()) as any
  return data?.data ?? data
}

export async function getRelationsByHistoricalCountryIds(
  historicalCountryIds: string[],
): Promise<HistoricalCountryRelationDto[]> {
  if (historicalCountryIds.length === 0) return []
  const conn = getApiConnection()
  const ids = historicalCountryIds.join(',')
  const res = await fetch(
    `${conn.host}/historical-countries/by-ids/relations?ids=${encodeURIComponent(ids)}`,
    { method: 'GET', headers: { ...conn.headers }, credentials: 'include' },
  )
  if (!res.ok) throw new Error(await res.text())
  const data = (await res.json()) as any
  return data?.data ?? data
}

export async function createHistoricalCountryRelation(
  data: CreateHistoricalCountryRelationDto,
): Promise<HistoricalCountryRelationDto> {
  const conn = getApiConnection()
  const res = await fetch(`${conn.host}/historical-countries/relations`, {
    method: 'POST',
    headers: { ...conn.headers, 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
    credentials: 'include',
  })
  if (!res.ok) throw new Error(await res.text())
  const out = (await res.json()) as any
  return out?.data ?? out
}

export async function updateHistoricalCountryRelation(
  relationId: string,
  data: UpdateHistoricalCountryRelationDto,
): Promise<HistoricalCountryRelationDto> {
  const conn = getApiConnection()
  const path = `/historical-countries/relations/${encodeURIComponent(relationId)}`
  const res = await fetch(`${conn.host}${path}`, {
    method: 'PUT',
    headers: { ...conn.headers, 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
    credentials: 'include',
  })
  if (!res.ok) throw new Error(await res.text())
  const out = (await res.json()) as any
  return out?.data ?? out
}

export async function deleteHistoricalCountryRelation(
  relationId: string,
): Promise<void> {
  const conn = getApiConnection()
  const path = `/historical-countries/relations/${encodeURIComponent(relationId)}`
  const res = await fetch(`${conn.host}${path}`, {
    method: 'DELETE',
    headers: { ...conn.headers },
    credentials: 'include',
  })
  if (!res.ok) throw new Error(await res.text())
}
