import { getApiConnection } from '../client'

export type CompanyStatus =
  | 'ACTIVE'
  | 'DISSOLVED'
  | 'MERGED'
  | 'SUSPENDED'
  | 'OTHER'

export type CompanyRelationSummary = {
  id: string
  name: string
}

export type FacilityType =
  | 'HEADQUARTERS'
  | 'FACTORY'
  | 'RND'
  | 'OFFICE'
  | 'OTHER'

export type CompanyFacilitySummary = {
  id: string
  facilityType: FacilityType | null
  name: string | null
  address: string | null
  openedAt: string | null
  closedAt: string | null
  note: string | null
  city: CompanyRelationSummary | null
}

export type CompanyHistoryItem = {
  id: string
  title: string
  occurredAt: string | null
  content: string | null
  note: string | null
  order: number | null
}

export type CompanyCategoryLink = {
  id: string
  categoryId: string
  categoryName: string
  fromDate: string | null
  toDate: string | null
  note: string | null
}

export type Company = {
  id: string
  name: string
  shortName: string | null
  localName: string | null
  description: string | null
  status: CompanyStatus | null
  foundedAt: string | null
  dissolvedAt: string | null
  websiteUrl: string | null
  logoUrl: string | null
  extra: unknown | null
  founderId: string | null
  countryId: string | null
  historicalCountryId: string | null
  headquartersCityId: string | null
  organizationId: string | null
  founder: CompanyRelationSummary | null
  country: CompanyRelationSummary | null
  historicalCountry: CompanyRelationSummary | null
  headquartersCity: CompanyRelationSummary | null
  organization: CompanyRelationSummary | null
  createdAt: string
  updatedAt: string
}

/** 상세 조회 응답 — 요약 관계 + 시설·연혁·카테고리 연결 */
export type CompanyDetail = Company & {
  facilities: CompanyFacilitySummary[]
  histories: CompanyHistoryItem[]
  categories: CompanyCategoryLink[]
}

export type CreateCompanyInput = {
  name: string
  shortName?: string | null
  localName?: string | null
  description?: string | null
  status?: CompanyStatus
  foundedAt?: string | null
  dissolvedAt?: string | null
  websiteUrl?: string | null
  logoUrl?: string | null
  founderId?: string | null
  countryId?: string | null
  historicalCountryId?: string | null
  headquartersCityId?: string | null
  organizationId?: string | null
}

export type UpdateCompanyInput = Partial<CreateCompanyInput> & {
  status?: CompanyStatus | null
}

async function request<T>(
  path: string,
  options?: { method?: string; body?: unknown; headers?: Record<string, string> },
): Promise<T> {
  const conn = getApiConnection()
  const url = `${conn.host}${path}`
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(conn.headers as Record<string, string>),
  }
  const res = await fetch(url, {
    method: options?.method ?? 'GET',
    headers: { ...headers, ...options?.headers },
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

export const companyApi = {
  getAll: async (): Promise<Company[]> => {
    const list = await request<Company[]>('/companies')
    return Array.isArray(list) ? list : []
  },

  getById: async (id: string): Promise<CompanyDetail | null> => {
    const item = await request<CompanyDetail | null>(
      `/companies/${encodeURIComponent(id)}`,
    )
    return item ?? null
  },

  create: async (data: CreateCompanyInput): Promise<Company> => {
    return request<Company>('/companies', { method: 'POST', body: data })
  },

  update: async (id: string, data: UpdateCompanyInput): Promise<Company> => {
    return request<Company>(`/companies/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: data,
    })
  },

  delete: async (id: string): Promise<void> => {
    await request<void>(`/companies/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    })
  },
}
