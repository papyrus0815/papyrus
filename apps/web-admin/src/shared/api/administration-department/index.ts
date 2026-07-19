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

/** Nestia에 아직 없는 `/administration-departments/:id/tenures` 응답용 (컨트롤러 `any[]`) */
export type AdministrationDepartmentTenureItem = {
  id: string
  termNumber?: number | null
  startDate: string | null
  endDate: string | null
  title?: string | null
  positionDefinition?: {
    id: string
    title: string
    positionType?: string
  } | null
  person?: {
    id: string
    name: string
    surname?: string | null
    middleName?: string | null
    nameDisplayOrder?: string | null
  } | null
  country?: { id: string; name: string } | null
  historicalCountry?: { id: string; name: string } | null
}

export type AdministrationDepartmentEvent = Awaited<
  ReturnType<typeof adminDeptApi.events.getDepartmentEvents>
>[number]

export type AdministrationDepartmentEventType =
  AdministrationDepartmentEvent['eventType']

export type CreateAdministrationDepartmentEventInput = Parameters<
  typeof adminDeptApi.events.createEvent
>[1]
export type UpdateAdministrationDepartmentEventInput = Parameters<
  typeof adminDeptApi.events.updateEvent
>[2]

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

  getAll: async (): Promise<AdministrationDepartment[]> => {
    const list = await adminDeptApi.getAll(getApiConnection())
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
   * 서버 `GET /administration-departments?historicalCountryId=`를 쓰지만 Nestia getAll
   * 시그니처에 아직 이 쿼리가 없어 직접 페치 — SDK 재생성 후 정리 가능.
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

  getDepartmentEvents: async (
    departmentId: string,
  ): Promise<AdministrationDepartmentEvent[]> => {
    const list = await adminDeptApi.events.getDepartmentEvents(
      getApiConnection(),
      departmentId,
    )
    return Array.isArray(list) ? list : []
  },

  createEvent: async (
    data: CreateAdministrationDepartmentEventInput,
  ): Promise<AdministrationDepartmentEvent> => {
    return adminDeptApi.events.createEvent(getApiConnection(), data)
  },

  updateEvent: async (
    eventId: string,
    data: UpdateAdministrationDepartmentEventInput,
  ): Promise<AdministrationDepartmentEvent> => {
    return adminDeptApi.events.updateEvent(getApiConnection(), eventId, data)
  },

  deleteEvent: async (eventId: string): Promise<void> => {
    await adminDeptApi.events.deleteEvent(getApiConnection(), eventId)
  },
}
