import { getApiConnection } from './client'

export type EventContextDomain =
  | 'LAW'
  | 'SOCIAL_PHENOMENON'
  | 'NATURAL_FEATURE'
  | 'INFRASTRUCTURE'
  | 'CLIMATE'
  | 'RESOURCE'
  | 'COMPANY_FACILITY'

export type EventContextRole =
  | 'BACKGROUND'
  | 'CAUSE'
  | 'OBJECTIVE'
  | 'OBSTACLE'
  | 'INSTRUMENT'
  | 'OUTCOME'
  | 'OTHER'

export interface EventContextLinkView {
  id: string
  eventId: string
  domain: EventContextDomain
  entityId: string
  title: string
  subtitle: string | null
  role: EventContextRole
  sideId: string | null
  sideName: string | null
  sideColor: string | null
  note: string | null
  sortOrder: number
}

export interface EventContextLinkInput {
  domain: EventContextDomain
  entityId: string
  role?: EventContextRole
  sideId?: string | null
  note?: string | null
}

export interface EventContextCatalogItem {
  id: string
  domain: EventContextDomain
  title: string
  subtitle: string | null
}

export async function listEventContextLinks(eventId: string): Promise<EventContextLinkView[]> {
  const conn = getApiConnection()
  const res = await fetch(`${conn.host}/events/${encodeURIComponent(eventId)}/context-links`, {
    method: 'GET',
    headers: conn.headers as HeadersInit,
    credentials: 'include',
  })
  if (!res.ok) throw new Error(`맥락 연결 목록을 불러오지 못했습니다 (${res.status})`)
  const data = (await res.json()) as { data?: EventContextLinkView[] } & EventContextLinkView[]
  return data?.data ?? data
}

export async function getEventContextCatalog(eventId: string): Promise<EventContextCatalogItem[]> {
  const conn = getApiConnection()
  const res = await fetch(`${conn.host}/events/${encodeURIComponent(eventId)}/context-catalog`, {
    method: 'GET',
    headers: conn.headers as HeadersInit,
    credentials: 'include',
  })
  if (!res.ok) throw new Error(`맥락 카탈로그를 불러오지 못했습니다 (${res.status})`)
  const data = (await res.json()) as { data?: EventContextCatalogItem[] } & EventContextCatalogItem[]
  return data?.data ?? data
}

export async function syncEventContextLinks(
  eventId: string,
  links: EventContextLinkInput[],
): Promise<EventContextLinkView[]> {
  const conn = getApiConnection()
  const res = await fetch(`${conn.host}/events/${encodeURIComponent(eventId)}/context-links`, {
    method: 'PUT',
    headers: { ...conn.headers, 'Content-Type': 'application/json' } as HeadersInit,
    body: JSON.stringify({ links }),
    credentials: 'include',
  })
  if (!res.ok) throw new Error(`맥락 연결을 저장하지 못했습니다 (${res.status})`)
  const data = (await res.json()) as { data?: EventContextLinkView[] } & EventContextLinkView[]
  return data?.data ?? data
}
