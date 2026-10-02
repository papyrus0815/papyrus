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
    headers: { ...conn.headers } as HeadersInit,
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
    headers: { ...conn.headers } as HeadersInit,
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
  | 'FOEDERATUS'
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
  /** 소속 시작·종료 — 구조화가 진실(BC·연 정밀도 가능) */
  start: StructuredPeriodPoint | null
  end: StructuredPeriodPoint | null
  /** 하위 호환 — AD 1000+ 완전 날짜일 때만 값이 있다 */
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
  start?: StructuredPeriodInput | null
  end?: StructuredPeriodInput | null
  /** @deprecated start를 쓸 것 */
  membershipStartDate?: string
  /** @deprecated end를 쓸 것 */
  membershipEndDate?: string
}

export interface UpdateHistoricalCountryMembershipDto {
  role?: HistoricalMembershipRole
  isLeadingMember?: boolean
  /** 3상 — 생략=유지, null=비움 */
  start?: StructuredPeriodInput | null
  end?: StructuredPeriodInput | null
  /** @deprecated start를 쓸 것 */
  membershipStartDate?: string
  /** @deprecated end를 쓸 것 */
  membershipEndDate?: string
}

/** 구조화 시점 입력 — year는 크기값, BC/AD는 era */
export interface StructuredPeriodInput {
  era: 'BC' | 'AD'
  year: number
  month?: number | null
  day?: number | null
}

/** 구조화 시점 응답 — precision은 서버가 채워진 칸에서 파생 */
export interface StructuredPeriodPoint {
  era: 'BC' | 'AD'
  year: number
  month: number | null
  day: number | null
  precision: 'year' | 'month' | 'day'
}

export async function getMembershipsByHistoricalCountryId(
  historicalCountryId: string,
): Promise<HistoricalCountryMembershipDto[]> {
  const conn = getApiConnection()
  const path = `/historical-countries/${encodeURIComponent(historicalCountryId)}/memberships`
  const res = await fetch(`${conn.host}${path}`, {
    method: 'GET',
    headers: { ...conn.headers } as HeadersInit,
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
    headers: { ...conn.headers } as HeadersInit,
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
    headers: { ...conn.headers } as HeadersInit,
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
    { method: 'GET', headers: { ...conn.headers } as HeadersInit, credentials: 'include' },
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
    { method: 'GET', headers: { ...conn.headers } as HeadersInit, credentials: 'include' },
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
    { method: 'GET', headers: { ...conn.headers } as HeadersInit, credentials: 'include' },
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
    headers: { ...conn.headers } as HeadersInit,
    credentials: 'include',
  })
  if (!res.ok) throw new Error(await res.text())
}

// ── 건국·멸망 요약 ────────────────────────────────────────────────────────────

export interface FoundingPerson {
  id: string
  name: string
  surname: string | null
  middleName: string | null
  nameDisplayOrder: string | null
  regnalName: string | null
  profileImageUrl: string | null
}

export interface FirstRuler {
  kind: 'monarch' | 'headOfState' | 'headOfGovernment'
  recordId: string
  regnalName: string | null
  title: string | null
  /**
   * numbered = 제1대로 기록된 행, earliest = 대수 기록이 없어 가장 이른 기록,
   * latest = 마지막 통치자(가장 늦게 시작한 기록)
   */
  basis: 'numbered' | 'earliest' | 'latest'
  startEra: 'BC' | 'AD' | null
  startYear: number | null
  endEra: 'BC' | 'AD' | null
  endYear: number | null
  person: FoundingPerson
}

export interface FoundingLinkedCountry {
  id: string
  name: string
  eventType: string
  startEra: 'BC' | 'AD' | null
  startYear: number | null
  endEra: 'BC' | 'AD' | null
  endYear: number | null
}

export type StatehoodAgentSide = 'FOUNDING' | 'DISSOLUTION'

/** 건국·멸망 주체 — 인물·역사 국가·현대 국가·자유 입력 중 하나 */
export interface StatehoodAgent {
  id: string
  side: StatehoodAgentSide
  kind: 'person' | 'historicalCountry' | 'country' | 'name'
  /** 인물·국가 id — kind='name'이면 null */
  refId: string | null
  name: string
  person: FoundingPerson | null
  startEra: 'BC' | 'AD' | null
  startYear: number | null
  endEra: 'BC' | 'AD' | null
  endYear: number | null
  note: string | null
  sortOrder: number
}

export interface FoundingSummary {
  foundingNote: string | null
  dissolutionNote: string | null
  /** 건국 주체 — 누가 세웠나(구버전 서버면 undefined) */
  founders?: StatehoodAgent[]
  /** 멸망 주체 — 누구에게 멸망했나(구버전 서버면 undefined) */
  dissolvers?: StatehoodAgent[]
  firstRulers: FirstRuler[]
  /** 마지막 통치자 — 종류별 한 명. 초대와 같은 기록이면 빠진다(구버전 서버면 undefined) */
  lastRulers?: FirstRuler[]
  predecessors: FoundingLinkedCountry[]
  successors: FoundingLinkedCountry[]
}

/**
 * 건국·멸망 요약 — 배경 서술 + 초대 통치자(재위·재임에서 파생) + 전신·후신(계승 관계).
 * GET /historical-countries/:id/founding-summary
 */
export async function getHistoricalCountryFoundingSummary(
  id: string,
): Promise<FoundingSummary> {
  const conn = getApiConnection()
  const res = await fetch(
    `${conn.host}/historical-countries/${encodeURIComponent(id)}/founding-summary`,
    { headers: { ...conn.headers } as HeadersInit, credentials: 'include' },
  )
  if (!res.ok) throw new Error(`건국 요약 조회 실패: HTTP ${res.status}`)
  return (await res.json()) as FoundingSummary
}

// ── 건국·멸망 주체 ────────────────────────────────────────────────────────────

export interface CreateStatehoodAgentInput {
  side: StatehoodAgentSide
  personId?: string
  agentHistoricalCountryId?: string
  agentCountryId?: string
  /** 등록되지 않은 주체의 이름 */
  name?: string
  note?: string
}

async function statehoodAgentRequest<T>(
  path: string,
  method: 'POST' | 'PATCH' | 'DELETE',
  body?: unknown,
): Promise<T> {
  const conn = getApiConnection()
  const res = await fetch(`${conn.host}${path}`, {
    method,
    headers: {
      ...(conn.headers as Record<string, string>),
      ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
    credentials: 'include',
  })
  if (!res.ok) {
    let message = `HTTP ${res.status}`
    try {
      const parsed = (await res.json()) as { message?: string; error?: { message?: string } }
      message = parsed.error?.message ?? parsed.message ?? message
    } catch {
      /* 본문 없음 */
    }
    throw new Error(message)
  }
  if (res.status === 204) return undefined as T
  const out = (await res.json()) as { data?: T } & T
  return (out?.data ?? out) as T
}

/** 건국·멸망 주체 추가 — POST /historical-countries/:id/statehood-agents */
export function createStatehoodAgent(
  historicalCountryId: string,
  input: CreateStatehoodAgentInput,
): Promise<StatehoodAgent> {
  return statehoodAgentRequest(
    `/historical-countries/${encodeURIComponent(historicalCountryId)}/statehood-agents`,
    'POST',
    input,
  )
}

/** 역할 메모 수정 — PATCH /historical-countries/statehood-agents/:agentId */
export function updateStatehoodAgent(
  agentId: string,
  input: { note?: string | null; sortOrder?: number },
): Promise<StatehoodAgent> {
  return statehoodAgentRequest(
    `/historical-countries/statehood-agents/${encodeURIComponent(agentId)}`,
    'PATCH',
    input,
  )
}

/** 건국·멸망 주체 삭제 — DELETE /historical-countries/statehood-agents/:agentId */
export function deleteStatehoodAgent(agentId: string): Promise<void> {
  return statehoodAgentRequest(
    `/historical-countries/statehood-agents/${encodeURIComponent(agentId)}`,
    'DELETE',
  )
}
