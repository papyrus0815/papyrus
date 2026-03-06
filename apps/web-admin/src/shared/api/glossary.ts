/**
 * 용어 사전(Glossary) API — 사건 본문 문구·관직 설명
 */
import { getApiConnection } from './client'

export type GlossaryTermDto = {
  id: string
  name: string
  description: string | null
  countryId: string | null
  historicalCountryId: string | null
  createdAt: string
  updatedAt: string
}

export type CreateGlossaryTermDto = {
  name: string
  description?: string | null
  countryId?: string | null
  historicalCountryId?: string | null
}

export type UpdateGlossaryTermDto = {
  name?: string
  description?: string | null
  countryId?: string | null
  historicalCountryId?: string | null
}

async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const conn = getApiConnection()
  const url = `${conn.host}${path.startsWith('/') ? path : `/${path}`}`
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(conn.headers as Record<string, string>),
    ...(options.headers as Record<string, string>),
  }
  const res = await fetch(url, { ...options, headers, credentials: 'include' })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Glossary API ${res.status}: ${text || res.statusText}`)
  }
  if (res.status === 204) return undefined as T
  return res.json()
}

export async function getGlossaryTerms(params?: {
  countryId?: string
  historicalCountryId?: string
  q?: string
}): Promise<GlossaryTermDto[]> {
  const qs = new URLSearchParams()
  if (params?.countryId) qs.set('countryId', params.countryId)
  if (params?.historicalCountryId)
    qs.set('historicalCountryId', params.historicalCountryId)
  if (params?.q) qs.set('q', params.q)
  const query = qs.toString()
  return request<GlossaryTermDto[]>(
    `/glossary/terms${query ? `?${query}` : ''}`,
    { method: 'GET' },
  )
}

export async function getGlossaryTermById(id: string): Promise<GlossaryTermDto> {
  return request<GlossaryTermDto>(`/glossary/terms/${id}`, { method: 'GET' })
}

export async function createGlossaryTerm(
  dto: CreateGlossaryTermDto,
): Promise<GlossaryTermDto> {
  return request<GlossaryTermDto>('/glossary/terms', {
    method: 'POST',
    body: JSON.stringify(dto),
  })
}

export async function updateGlossaryTerm(
  id: string,
  dto: UpdateGlossaryTermDto,
): Promise<GlossaryTermDto> {
  return request<GlossaryTermDto>(`/glossary/terms/${id}`, {
    method: 'PUT',
    body: JSON.stringify(dto),
  })
}

export async function deleteGlossaryTerm(id: string): Promise<void> {
  return request<void>(`/glossary/terms/${id}`, { method: 'DELETE' })
}
