import { getApiConnection } from '../client'

export type AdministrationDepartmentCategory = {
  id: string
  name: string
  nameEn: string | null
}

export type AdministrationDepartment = {
  id: string
  name: string
  thumbnailUrl?: string | null
  countryId: string
  parentId?: string | null
  categoryId?: string | null
  category?: AdministrationDepartmentCategory | null
  description?: string | null
  establishedDate?: string | null
  abolishedDate?: string | null
  successorId?: string | null
  successor?: { id: string; name: string } | null
  createdAt: string
  updatedAt: string
}

export type CreateAdministrationDepartmentInput = {
  name: string
  countryId: string
  parentId?: string | null
  categoryId?: string | null
  thumbnailUrl?: string | null
  description?: string | null
  establishedDate?: string | null
  abolishedDate?: string | null
  successorId?: string | null
}

export type UpdateAdministrationDepartmentInput = Partial<
  Omit<CreateAdministrationDepartmentInput, 'countryId'>
>

/** 부처별 역대 장관(재임) 한 건 */
export type AdministrationDepartmentTenureItem = {
  id: string
  termNumber?: number | null
  startDate: string | null
  endDate: string | null
  title?: string | null
  positionDefinition?: { id: string; title: string; positionType?: string } | null
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

/** 기관 계획·조율·변경 (사건처럼 시간순). 첨부는 Attachment(ownerType=ADMINISTRATION_DEPARTMENT_EVENT)로. */
export type AdministrationDepartmentEventType =
  | 'PLAN'
  | 'COORDINATION'
  | 'POLICY'
  | 'RESTRUCTURE'
  | 'OTHER'

export type AdministrationDepartmentEvent = {
  id: string
  departmentId: string
  title: string
  description: string | null
  startDate: string | null
  endDate: string | null
  eventType: AdministrationDepartmentEventType
  background: string | null
  aftermath: string | null
  thumbnailUrl: string | null
  createdAt: string
  updatedAt: string
}

export type CreateAdministrationDepartmentEventInput = {
  departmentId: string
  title: string
  description?: string | null
  startDate?: string | null
  endDate?: string | null
  eventType?: AdministrationDepartmentEventType
  background?: string | null
  aftermath?: string | null
  thumbnailUrl?: string | null
}

export type UpdateAdministrationDepartmentEventInput = Partial<
  Omit<CreateAdministrationDepartmentEventInput, 'departmentId'>
>

async function request<T>(
  path: string,
  options?: RequestInit & { method?: string; body?: unknown },
): Promise<T> {
  const conn = getApiConnection()
  const url = `${conn.host}${path}`
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(conn.headers as Record<string, string>),
  }
  const res = await fetch(url, {
    ...options,
    headers: { ...headers, ...options?.headers },
    method: options?.method ?? 'GET',
    body:
      options?.body != null
        ? typeof options.body === 'string'
          ? options.body
          : JSON.stringify(options.body)
        : undefined,
  })
  if (res.status === 204) return undefined as T
  if (!res.ok) {
    const text = await res.text()
    throw new Error(text || `HTTP ${res.status}`)
  }
  if (res.headers.get('content-type')?.includes('application/json')) {
    return res.json() as Promise<T>
  }
  return undefined as T
}

export const administrationDepartmentApi = {
  getCategories: async (): Promise<AdministrationDepartmentCategory[]> => {
    const list = await request<AdministrationDepartmentCategory[]>(
      '/administration-departments/categories',
    )
    return Array.isArray(list) ? list : []
  },

  createCategory: async (data: { name: string; nameEn?: string | null }): Promise<AdministrationDepartmentCategory> => {
    return request<AdministrationDepartmentCategory>('/administration-departments/categories', {
      method: 'POST',
      body: data,
    })
  },

  updateCategory: async (
    id: string,
    data: { name?: string; nameEn?: string | null },
  ): Promise<AdministrationDepartmentCategory> => {
    return request<AdministrationDepartmentCategory>(
      `/administration-departments/categories/${encodeURIComponent(id)}`,
      { method: 'PATCH', body: data },
    )
  },

  deleteCategory: async (id: string): Promise<void> => {
    await request<void>(`/administration-departments/categories/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    })
  },

  getAll: async (): Promise<AdministrationDepartment[]> => {
    const list = await request<AdministrationDepartment[]>(
      '/administration-departments',
    )
    return Array.isArray(list) ? list : []
  },

  getByCountryId: async (
    countryId: string,
  ): Promise<AdministrationDepartment[]> => {
    const list = await request<AdministrationDepartment[]>(
      `/administration-departments/country/${encodeURIComponent(countryId)}`,
    )
    return Array.isArray(list) ? list : []
  },

  getById: async (id: string): Promise<AdministrationDepartment | null> => {
    const item = await request<AdministrationDepartment | null>(
      `/administration-departments/${encodeURIComponent(id)}`,
    )
    return item ?? null
  },

  /** 부처에 연결된 직위의 역대 재임(역대 장관) 목록 */
  getTenuresByDepartmentId: async (
    departmentId: string,
  ): Promise<AdministrationDepartmentTenureItem[]> => {
    const list = await request<AdministrationDepartmentTenureItem[]>(
      `/administration-departments/${encodeURIComponent(departmentId)}/tenures`,
    )
    return Array.isArray(list) ? list : []
  },

  create: async (
    data: CreateAdministrationDepartmentInput,
  ): Promise<AdministrationDepartment> => {
    return request<AdministrationDepartment>('/administration-departments', {
      method: 'POST',
      body: data,
    })
  },

  update: async (
    id: string,
    data: UpdateAdministrationDepartmentInput,
  ): Promise<AdministrationDepartment> => {
    return request<AdministrationDepartment>(
      `/administration-departments/${encodeURIComponent(id)}`,
      {
        method: 'PATCH',
        body: data,
      },
    )
  },

  delete: async (id: string): Promise<void> => {
    await request<void>(
      `/administration-departments/${encodeURIComponent(id)}`,
      { method: 'DELETE' },
    )
  },

  // 기관 계획·조율 이벤트 (사건처럼)
  getDepartmentEvents: async (
    departmentId: string,
  ): Promise<AdministrationDepartmentEvent[]> => {
    const list = await request<AdministrationDepartmentEvent[]>(
      `/administration-departments/${encodeURIComponent(departmentId)}/events`,
    )
    return Array.isArray(list) ? list : []
  },

  createEvent: async (
    data: CreateAdministrationDepartmentEventInput,
  ): Promise<AdministrationDepartmentEvent> => {
    return request<AdministrationDepartmentEvent>(
      '/administration-departments/events',
      { method: 'POST', body: data },
    )
  },

  updateEvent: async (
    eventId: string,
    data: UpdateAdministrationDepartmentEventInput,
  ): Promise<AdministrationDepartmentEvent> => {
    return request<AdministrationDepartmentEvent>(
      `/administration-departments/events/${encodeURIComponent(eventId)}`,
      { method: 'PATCH', body: data },
    )
  },

  deleteEvent: async (eventId: string): Promise<void> => {
    await request<void>(
      `/administration-departments/events/${encodeURIComponent(eventId)}`,
      { method: 'DELETE' },
    )
  },
}
