import { getApiConnection } from '../client'

export type NaturalFeatureType = 'mountain' | 'river' | 'lake' | 'coast'

export type NaturalFeature = {
  id: string
  countryId: string
  type: NaturalFeatureType
  name: string
  localName: string | null
  region: string | null
  latitude: number | null
  longitude: number | null
  heightM: number | null
  lengthKm: number | null
  areaSqKm: number | null
  isProtected: boolean
  attributes: Record<string, unknown> | null
  createdAt: string
  updatedAt: string
}

export type CreateNaturalFeatureInput = {
  countryId: string
  type: NaturalFeatureType
  name: string
  localName?: string | null
  region?: string | null
  latitude?: number | null
  longitude?: number | null
  heightM?: number | null
  lengthKm?: number | null
  areaSqKm?: number | null
  isProtected?: boolean
  attributes?: Record<string, unknown> | null
}

export type UpdateNaturalFeatureInput = Partial<
  Omit<CreateNaturalFeatureInput, 'countryId'>
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

export const naturalFeatureApi = {
  list: async (params?: {
    countryId?: string
    type?: NaturalFeatureType
  }): Promise<NaturalFeature[]> => {
    const search = new URLSearchParams()
    if (params?.countryId) search.set('countryId', params.countryId)
    if (params?.type) search.set('type', params.type)
    const q = search.toString()
    const path = q ? `/natural-features?${q}` : '/natural-features'
    const list = await request<NaturalFeature[]>(path)
    return Array.isArray(list) ? list : []
  },

  getById: async (id: string): Promise<NaturalFeature | null> => {
    return request<NaturalFeature | null>(
      `/natural-features/${encodeURIComponent(id)}`,
    )
  },

  create: async (data: CreateNaturalFeatureInput): Promise<NaturalFeature> => {
    return request<NaturalFeature>('/natural-features', {
      method: 'POST',
      body: data,
    })
  },

  update: async (
    id: string,
    data: UpdateNaturalFeatureInput,
  ): Promise<NaturalFeature> => {
    return request<NaturalFeature>(
      `/natural-features/${encodeURIComponent(id)}`,
      { method: 'PATCH', body: data },
    )
  },

  delete: async (id: string): Promise<void> => {
    await request<void>(`/natural-features/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    })
  },
}
