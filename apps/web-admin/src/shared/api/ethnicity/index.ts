import { getApiConnection } from '../client'

export type Ethnicity = {
  id: string
  name: string
  nameLocal: string | null
  description: string | null
  thumbnailUrl: string | null
  parentId: string | null
  parent?: { id: string; name: string } | null
  createdAt: string
  updatedAt: string
}

export type CreateEthnicityInput = {
  name: string
  nameLocal?: string | null
  description?: string | null
  thumbnailUrl?: string | null
  parentId?: string | null
}

export type UpdateEthnicityInput = {
  name?: string
  nameLocal?: string | null
  description?: string | null
  thumbnailUrl?: string | null
  parentId?: string | null
}

async function request<T>(
  path: string,
  // RequestInit['body'](BodyInit)와 교차되면 객체 body 전달이 막히므로 body를 분리해 unknown으로 받음
  options?: Omit<RequestInit, 'body'> & { method?: string; body?: unknown },
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

export const ethnicityApi = {
  getAll: async (params?: { countryId?: string; historicalCountryId?: string }): Promise<Ethnicity[]> => {
    const search = new URLSearchParams()
    if (params?.countryId) search.set('countryId', params.countryId)
    if (params?.historicalCountryId) search.set('historicalCountryId', params.historicalCountryId)
    const q = search.toString()
    const path = q ? `/ethnicities?${q}` : '/ethnicities'
    const list = await request<Ethnicity[]>(path)
    return Array.isArray(list) ? list : []
  },

  getById: async (id: string): Promise<Ethnicity | null> => {
    const item = await request<Ethnicity | null>(`/ethnicities/${encodeURIComponent(id)}`)
    return item ?? null
  },

  create: async (data: CreateEthnicityInput): Promise<Ethnicity> => {
    return request<Ethnicity>('/ethnicities', { method: 'POST', body: data })
  },

  update: async (id: string, data: UpdateEthnicityInput): Promise<Ethnicity> => {
    return request<Ethnicity>(`/ethnicities/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: data,
    })
  },

  delete: async (id: string): Promise<void> => {
    await request<void>(`/ethnicities/${encodeURIComponent(id)}`, { method: 'DELETE' })
  },

  setCountryEthnicities: async (
    countryId: string,
    ethnicityIds: string[],
  ): Promise<Ethnicity[]> => {
    return request<Ethnicity[]>(
      `/ethnicities/country/${encodeURIComponent(countryId)}`,
      { method: 'PUT', body: { ethnicityIds } },
    )
  },

  setHistoricalCountryEthnicities: async (
    historicalCountryId: string,
    ethnicityIds: string[],
  ): Promise<Ethnicity[]> => {
    return request<Ethnicity[]>(
      `/ethnicities/historical-country/${encodeURIComponent(historicalCountryId)}`,
      { method: 'PUT', body: { ethnicityIds } },
    )
  },
}
