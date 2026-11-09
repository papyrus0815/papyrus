import * as adminDeptApi from '@api/functional/administration_departments'

import { getApiConnection } from '../client'

// SDK 기반 타입 — 서버 DTO와 동일
export type AdministrationDepartmentCategory = Awaited<
  ReturnType<typeof adminDeptApi.categories.getCategories>
>[number]

export type AdministrationDepartment = NonNullable<
  Awaited<ReturnType<typeof adminDeptApi.getById>>
>

export type AdministrationDepartmentMilitaryUnit =
  AdministrationDepartment['militaryUnits'][number]

export type CreateAdministrationDepartmentInput = Parameters<
  typeof adminDeptApi.create
>[1]
export type UpdateAdministrationDepartmentInput = Parameters<
  typeof adminDeptApi.update
>[2]

export type CreateDepartmentTransitionInput = Parameters<
  typeof adminDeptApi.transitions.addTransition
>[2]
export type UpdateDepartmentTransitionInput = Parameters<
  typeof adminDeptApi.transitions.updateTransition
>[2]

/** Nestia에 아직 없는 `/administration-departments/:id/tenures` 응답용 (컨트롤러 `any[]`) */
export type AdministrationDepartmentTenureItem = {
  id: string
  personId?: string
  ordinal?: number | null
  subTermNumber?: number | null
  isMonarchical?: boolean
  startDate: string | null
  endDate: string | null
  startDatePrecision?: string | null
  startEra?: string | null
  startYear?: number | null
  startMonth?: number | null
  startDay?: number | null
  endEra?: string | null
  endYear?: number | null
  endMonth?: number | null
  endDay?: number | null
  title?: string | null
  cabinetId?: string | null
  administrationDepartmentId?: string | null
  positionDefinition?: {
    id: string
    title: string
    positionType?: string
    isMonarchical?: boolean
  } | null
  person?: {
    id: string
    name: string
    surname?: string | null
    middleName?: string | null
    nameDisplayOrder?: string | null
    country?: { defaultNameDisplayOrder?: string | null } | null
  } | null
  country?: { id: string; name: string } | null
  historicalCountry?: { id: string; name: string } | null
}

export type AdministrationDepartmentEvent = Awaited<
  ReturnType<typeof adminDeptApi.events.getDepartmentEvents>
>[number]

export type EventDepartmentRoleValue =
  | 'ISSUER'
  | 'RECIPIENT'
  | 'PRINCIPAL'
  | 'PARTICIPANT'
  | 'OTHER'

/** 사건 속 기관의 역할 — 기관 상세 '관련 사건' 블록이 쓰는 이름 */
export type AdministrationDepartmentEventRole = EventDepartmentRoleValue

/** 기관 종류(부처·외청·군 최고사령부·총독부·궁내·기타) */
export type AdministrationDepartmentKind = AdministrationDepartment['kind']

/** 기관 종류 선택지·라벨 — 정본(폼·상세·사건 상세가 함께 쓴다) */
export const DEPARTMENT_KIND_OPTIONS: ReadonlyArray<{
  value: AdministrationDepartmentKind
  label: string
}> = [
  { value: 'MINISTRY', label: '부처' },
  { value: 'AGENCY', label: '외청·위원회' },
  { value: 'MILITARY_COMMAND', label: '군 최고사령부' },
  { value: 'COLONIAL_GOVERNMENT', label: '총독부·속령' },
  { value: 'ROYAL_HOUSEHOLD', label: '궁내·왕실' },
  { value: 'OTHER', label: '기타' },
]

export const DEPARTMENT_KIND_LABEL = Object.fromEntries(
  DEPARTMENT_KIND_OPTIONS.map((option) => [option.value, option.label]),
) as Record<AdministrationDepartmentKind, string>

/** 사건 속 기관의 역할 선택지·라벨 — 정본 */
export const EVENT_DEPARTMENT_ROLE_OPTIONS: ReadonlyArray<{
  value: EventDepartmentRoleValue
  label: string
  description: string
}> = [
  { value: 'ISSUER', label: '발령·작성', description: '명령·지령·법령을 기안하거나 내린 기관' },
  { value: 'RECIPIENT', label: '수령·집행', description: '명령을 받아 집행한 기관' },
  { value: 'PRINCIPAL', label: '주체', description: '사건을 주도한 기관' },
  { value: 'PARTICIPANT', label: '관여', description: '참여·협조한 기관' },
  { value: 'OTHER', label: '기타', description: '' },
]

export const EVENT_DEPARTMENT_ROLE_LABEL = Object.fromEntries(
  EVENT_DEPARTMENT_ROLE_OPTIONS.map((option) => [option.value, option.label]),
) as Record<EventDepartmentRoleValue, string>

/** Nestia 미생성(또는 시그니처 미반영) GET 경로용 배열 페치 */
async function fetchJsonList<T>(path: string): Promise<T[]> {
  const conn = getApiConnection()
  const url = `${conn.host}${path}`
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(conn.headers as Record<string, string>),
  }
  const res = await fetch(url, { method: 'GET', headers })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(text || `HTTP ${res.status}`)
  }
  const list = (await res.json()) as T[]
  return Array.isArray(list) ? list : []
}

async function fetchJsonRequest<T>(
  path: string,
  method: 'POST' | 'PATCH' | 'DELETE',
  body?: unknown,
): Promise<T> {
  const conn = getApiConnection()
  const url = `${conn.host}${path}`
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(conn.headers as Record<string, string>),
  }
  const res = await fetch(url, {
    method,
    headers,
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  })
  if (!res.ok) {
    const text = await res.text()
    try {
      const parsed = JSON.parse(text) as { message?: string | string[] }
      const msg = Array.isArray(parsed.message)
        ? parsed.message.join(', ')
        : parsed.message
      throw new Error(msg || text || `HTTP ${res.status}`)
    } catch (e) {
      if (e instanceof Error && e.message !== text) throw e
      throw new Error(text || `HTTP ${res.status}`)
    }
  }
  if (res.status === 204) return undefined as T
  return (await res.json()) as T
}

export const administrationDepartmentApi = {
  getCategories: async (): Promise<AdministrationDepartmentCategory[]> => {
    const list = await adminDeptApi.categories.getCategories(getApiConnection())
    return Array.isArray(list) ? list : []
  },

  createCategory: async (data: {
    name: string
    nameEn?: string | null
  }): Promise<AdministrationDepartmentCategory> => {
    return adminDeptApi.categories.createCategory(getApiConnection(), data)
  },

  updateCategory: async (
    id: string,
    data: { name?: string; nameEn?: string | null },
  ): Promise<AdministrationDepartmentCategory> => {
    return adminDeptApi.categories.updateCategory(getApiConnection(), id, data)
  },

  deleteCategory: async (id: string): Promise<void> => {
    await adminDeptApi.categories.deleteCategory(getApiConnection(), id)
  },

  getAll: async (params?: {
    countryId?: string
    historicalCountryId?: string
    search?: string
    kind?: string
    take?: number
  }): Promise<AdministrationDepartment[]> => {
    const list = await adminDeptApi.getAll(
      getApiConnection(),
      params?.countryId,
      params?.historicalCountryId,
      params?.search,
      params?.kind,
      params?.take != null ? String(params.take) : undefined,
    )
    return Array.isArray(list) ? list : []
  },

  getByCountryId: async (
    countryId: string,
  ): Promise<AdministrationDepartment[]> => {
    const list = await adminDeptApi.country.getByCountryId(
      getApiConnection(),
      countryId,
    )
    return Array.isArray(list) ? list : []
  },

  /**
   * 역사적 국가별 행정부처 목록 (조선 6조 등).
   */
  getByHistoricalCountryId: async (
    historicalCountryId: string,
  ): Promise<AdministrationDepartment[]> => {
    return fetchJsonList<AdministrationDepartment>(
      `/administration-departments?historicalCountryId=${encodeURIComponent(historicalCountryId)}`,
    )
  },

  getById: async (id: string): Promise<AdministrationDepartment | null> => {
    return adminDeptApi.getById(getApiConnection(), id)
  },

  /** 부처별 재임 — Nestia 미생성 엔드포인트 */
  getTenuresByDepartmentId: async (
    departmentId: string,
  ): Promise<AdministrationDepartmentTenureItem[]> => {
    return fetchJsonList<AdministrationDepartmentTenureItem>(
      `/administration-departments/${encodeURIComponent(departmentId)}/tenures`,
    )
  },

  create: async (
    data: CreateAdministrationDepartmentInput,
  ): Promise<AdministrationDepartment> => {
    return adminDeptApi.create(getApiConnection(), data)
  },

  update: async (
    id: string,
    data: UpdateAdministrationDepartmentInput,
  ): Promise<AdministrationDepartment> => {
    return adminDeptApi.update(getApiConnection(), id, data)
  },

  delete: async (id: string): Promise<void> => {
    await adminDeptApi._delete(getApiConnection(), id)
  },

  addTransition: async (
    predecessorId: string,
    data: CreateDepartmentTransitionInput,
  ): Promise<AdministrationDepartment> => {
    return adminDeptApi.transitions.addTransition(
      getApiConnection(),
      predecessorId,
      data,
    )
  },

  updateTransition: async (
    transitionId: string,
    data: UpdateDepartmentTransitionInput,
  ): Promise<void> => {
    await adminDeptApi.transitions.updateTransition(
      getApiConnection(),
      transitionId,
      data,
    )
  },

  deleteTransition: async (transitionId: string): Promise<void> => {
    await adminDeptApi.transitions.deleteTransition(
      getApiConnection(),
      transitionId,
    )
  },

  getDepartmentEvents: async (
    departmentId: string,
  ): Promise<AdministrationDepartmentEvent[]> => {
    const list = await adminDeptApi.events.getDepartmentEvents(
      getApiConnection(),
      departmentId,
    )
    return Array.isArray(list) ? list : []
  },

  linkDepartmentEvent: async (
    eventId: string,
    data: {
      departmentId: string
      role: EventDepartmentRoleValue
      roleDescription?: string | null
    },
  ): Promise<unknown> => {
    return fetchJsonRequest(
      `/events/${encodeURIComponent(eventId)}/departments`,
      'POST',
      data,
    )
  },

  updateDepartmentEventLink: async (
    eventId: string,
    relationId: string,
    data: {
      role?: EventDepartmentRoleValue
      roleDescription?: string | null
    },
  ): Promise<unknown> => {
    return fetchJsonRequest(
      `/events/${encodeURIComponent(eventId)}/departments/${encodeURIComponent(relationId)}`,
      'PATCH',
      data,
    )
  },

  unlinkDepartmentEvent: async (
    eventId: string,
    relationId: string,
  ): Promise<void> => {
    await fetchJsonRequest(
      `/events/${encodeURIComponent(eventId)}/departments/${encodeURIComponent(relationId)}`,
      'DELETE',
    )
  },
}
