/**
 * 인물 연보(PersonLifeEvent) API — 자유 서술형 시간축 기록
 * 예: "1820년 파리 유학", "1835년 저서 출간"
 */
import { getApiConnection } from './client'

export const PERSON_LIFE_EVENT_CATEGORIES = [
  'EDUCATION',
  'TRAVEL',
  'PUBLICATION',
  'EXILE',
  'AWARD',
  'PERSONAL',
  'CAREER',
  'OTHER',
] as const

export type PersonLifeEventCategory = (typeof PERSON_LIFE_EVENT_CATEGORIES)[number]

export const PERSON_LIFE_EVENT_CATEGORY_LABEL: Record<PersonLifeEventCategory, string> = {
  EDUCATION: '교육·학업',
  TRAVEL: '여행·유학',
  PUBLICATION: '저술·출간',
  EXILE: '망명·유배',
  AWARD: '수상·훈장',
  PERSONAL: '개인사',
  CAREER: '경력 변경',
  OTHER: '기타',
}

/** 카테고리별 테마 색상 (light/dark 공통 계열) */
export const PERSON_LIFE_EVENT_CATEGORY_COLOR: Record<
  PersonLifeEventCategory,
  { base: string; soft: string; text: string }
> = {
  EDUCATION: { base: '#0ea5e9', soft: 'rgba(14,165,233,0.14)', text: '#0369a1' },
  TRAVEL:    { base: '#14b8a6', soft: 'rgba(20,184,166,0.14)', text: '#0f766e' },
  PUBLICATION: { base: '#8b5cf6', soft: 'rgba(139,92,246,0.14)', text: '#6d28d9' },
  EXILE:     { base: '#f97316', soft: 'rgba(249,115,22,0.14)', text: '#c2410c' },
  AWARD:     { base: '#f59e0b', soft: 'rgba(245,158,11,0.14)', text: '#b45309' },
  PERSONAL:  { base: '#ec4899', soft: 'rgba(236,72,153,0.14)', text: '#be185d' },
  CAREER:    { base: '#6366f1', soft: 'rgba(99,102,241,0.14)', text: '#4338ca' },
  OTHER:     { base: '#94a3b8', soft: 'rgba(148,163,184,0.14)', text: '#475569' },
}

export type DatePrecision = 'year' | 'month' | 'day'

export interface PersonLifeEvent {
  id: string
  personId: string
  title: string
  description: string | null
  category: PersonLifeEventCategory | null
  startDate: string | null
  startDatePrecision: DatePrecision | null
  endDate: string | null
  endDatePrecision: DatePrecision | null
  sortOrder: number | null
  accountId: string | null
  createdAt: string
  updatedAt: string
}

export interface CreatePersonLifeEventBody {
  personId: string
  title: string
  description?: string
  category?: PersonLifeEventCategory
  startDate?: string
  startDatePrecision?: DatePrecision
  endDate?: string
  endDatePrecision?: DatePrecision
  sortOrder?: number
}

export interface UpdatePersonLifeEventBody {
  title?: string
  description?: string | null
  category?: PersonLifeEventCategory | null
  startDate?: string | null
  startDatePrecision?: DatePrecision | null
  endDate?: string | null
  endDatePrecision?: DatePrecision | null
  sortOrder?: number | null
}

async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  const conn = getApiConnection()
  const base = conn.host.replace(/\/$/, '')
  const url = `${base}${path.startsWith('/') ? path : `/${path}`}`
  const headers = new Headers()
  headers.set('Content-Type', 'application/json')
  if (conn.headers) {
    for (const [k, v] of Object.entries(conn.headers)) {
      if (v != null && v !== '') headers.set(k, String(v))
    }
  }
  const fetchFn = conn.fetch ?? fetch
  const res = await fetchFn(url, {
    ...init,
    headers,
    credentials: conn.options?.credentials ?? 'include',
  })
  if (!res.ok) {
    let msg = res.statusText
    try {
      const body = await res.text()
      if (body) msg = body
    } catch {
      /* ignore */
    }
    throw new Error(msg)
  }
  if (res.status === 204) return undefined as T
  return res.json() as Promise<T>
}

export function listPersonLifeEvents(personId: string): Promise<PersonLifeEvent[]> {
  return requestJson<PersonLifeEvent[]>(
    `/person-life-events/by-person/${encodeURIComponent(personId)}`,
    { method: 'GET' },
  )
}

export function createPersonLifeEvent(
  body: CreatePersonLifeEventBody,
): Promise<PersonLifeEvent> {
  return requestJson<PersonLifeEvent>(`/person-life-events`, {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

export function updatePersonLifeEvent(
  id: string,
  body: UpdatePersonLifeEventBody,
): Promise<PersonLifeEvent> {
  return requestJson<PersonLifeEvent>(
    `/person-life-events/${encodeURIComponent(id)}`,
    { method: 'PUT', body: JSON.stringify(body) },
  )
}

export function deletePersonLifeEvent(id: string): Promise<{ success: true }> {
  return requestJson<{ success: true }>(
    `/person-life-events/${encodeURIComponent(id)}`,
    { method: 'DELETE' },
  )
}
