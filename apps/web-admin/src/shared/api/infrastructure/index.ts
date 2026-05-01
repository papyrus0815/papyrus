import { getApiConnection } from '../client'

export type InfrastructureType = 'highway' | 'railway' | 'airport' | 'port'

export type Infrastructure = {
  id: string
  countryId: string
  type: InfrastructureType
  name: string
  localName: string | null
  code: string | null
  region: string | null
  latitude: number | null
  longitude: number | null
  lengthKm: number | null
  capacity: string | null
  operatorName: string | null
  openedYear: number | null
  attributes: Record<string, unknown> | null
  createdAt: string
  updatedAt: string
}

export type CreateInfrastructureInput = {
  countryId: string
  type: InfrastructureType
  name: string
  localName?: string | null
  code?: string | null
  region?: string | null
  latitude?: number | null
  longitude?: number | null
  lengthKm?: number | null
  capacity?: string | null
  operatorName?: string | null
  openedYear?: number | null
  attributes?: Record<string, unknown> | null
}

export type UpdateInfrastructureInput = Partial<
  Omit<CreateInfrastructureInput, 'countryId'>
>

async function request<T>(
  path: string,
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

export const infrastructureApi = {
  list: async (params?: {
    countryId?: string
    type?: InfrastructureType
  }): Promise<Infrastructure[]> => {
    const search = new URLSearchParams()
    if (params?.countryId) search.set('countryId', params.countryId)
    if (params?.type) search.set('type', params.type)
    const q = search.toString()
    const path = q ? `/infrastructures?${q}` : '/infrastructures'
    const list = await request<Infrastructure[]>(path)
    return Array.isArray(list) ? list : []
  },

  getById: async (id: string): Promise<Infrastructure | null> => {
    return request<Infrastructure | null>(
      `/infrastructures/${encodeURIComponent(id)}`,
    )
  },

  create: async (data: CreateInfrastructureInput): Promise<Infrastructure> => {
    return request<Infrastructure>('/infrastructures', {
      method: 'POST',
      body: data,
    })
  },

  update: async (
    id: string,
    data: UpdateInfrastructureInput,
  ): Promise<Infrastructure> => {
    return request<Infrastructure>(
      `/infrastructures/${encodeURIComponent(id)}`,
      { method: 'PATCH', body: data },
    )
  },

  delete: async (id: string): Promise<void> => {
    await request<void>(`/infrastructures/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    })
  },
}
