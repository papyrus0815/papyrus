import { getApiConnection } from '../client'

export type CompanyCategory = {
  id: string
  name: string
  slug: string | null
  description: string | null
  parentId: string | null
  parent: { id: string; name: string } | null
  childrenCount: number
  companyCount: number
  createdAt: string
  updatedAt: string
}

export type CreateCompanyCategoryInput = {
  name: string
  slug?: string | null
  description?: string | null
  parentId?: string | null
}

export type UpdateCompanyCategoryInput = Partial<CreateCompanyCategoryInput>

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

export const companyCategoryApi = {
  getAll: async (): Promise<CompanyCategory[]> => {
    const list = await request<CompanyCategory[]>('/company-categories')
    return Array.isArray(list) ? list : []
  },

  getById: async (id: string): Promise<CompanyCategory | null> => {
    const item = await request<CompanyCategory | null>(
      `/company-categories/${encodeURIComponent(id)}`,
    )
    return item ?? null
  },

  create: async (
    data: CreateCompanyCategoryInput,
  ): Promise<CompanyCategory> => {
    return request<CompanyCategory>('/company-categories', {
      method: 'POST',
      body: data,
    })
  },

  update: async (
    id: string,
    data: UpdateCompanyCategoryInput,
  ): Promise<CompanyCategory> => {
    return request<CompanyCategory>(
      `/company-categories/${encodeURIComponent(id)}`,
      { method: 'PUT', body: data },
    )
  },

  delete: async (id: string): Promise<void> => {
    await request<void>(`/company-categories/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    })
  },
}
