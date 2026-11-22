/**
 * 이념 카탈로그 — 정당·조직·인물 공용(B2, docs/political-party-model-review.md §4.3).
 */
import { getApiConnection } from './client'

export type IdeologyCategory = 'IDEOLOGY' | 'POLICY' | 'INTEREST' | 'OTHER'

export const IDEOLOGY_CATEGORY_OPTIONS: Array<{ value: IdeologyCategory; label: string; hint: string }> = [
  { value: 'IDEOLOGY', label: '사상', hint: '파시즘·자유주의·공화주의·반공주의' },
  { value: 'POLICY', label: '정책 노선', hint: '자유무역·보통선거·농지개혁' },
  { value: 'INTEREST', label: '이익 대변', hint: '참전군인 권익·소수민족 권익' },
  { value: 'OTHER', label: '기타', hint: '' },
]

export function labelIdeologyCategory(category: string | null | undefined): string {
  return IDEOLOGY_CATEGORY_OPTIONS.find((option) => option.value === category)?.label ?? ''
}

export type IdeologyAliasDto = { id: string; name: string; languageCode?: string | null }

export type IdeologyDto = {
  id: string
  name: string
  englishName?: string | null
  category: IdeologyCategory
  parentId?: string | null
  parent?: { id: string; name: string } | null
  description?: string | null
  aliases?: IdeologyAliasDto[]
  _count?: { partyLinks: number; children: number }
}

export type IdeologyInput = {
  name: string
  englishName?: string | null
  category?: IdeologyCategory
  parentId?: string | null
  description?: string | null
  /** 다른 표기 — 주면 통째로 바꾼다 */
  aliases?: Array<{ name: string; languageCode?: string | null }>
}

/** 서버 오류 본문({ message })에서 사람이 읽을 문장만 꺼낸다 */
function errorMessageOf(body: string, fallback: string): string {
  try {
    const parsed = JSON.parse(body) as { message?: string | string[] }
    if (Array.isArray(parsed.message)) return parsed.message.join(' · ')
    if (typeof parsed.message === 'string') return parsed.message
  } catch {
    /* JSON 아님 */
  }
  return body || fallback
}

async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  const conn = getApiConnection()
  const base = conn.host.replace(/\/$/, '')
  const headers = new Headers()
  headers.set('Content-Type', 'application/json')
  for (const [headerKey, headerValue] of Object.entries(conn.headers ?? {})) {
    if (headerValue != null && headerValue !== '') headers.set(headerKey, String(headerValue))
  }
  const fetchFn = conn.fetch ?? fetch
  const res = await fetchFn(`${base}${path}`, {
    ...init,
    headers,
    credentials: conn.options?.credentials ?? 'include',
  })
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(errorMessageOf(body, res.statusText))
  }
  if (res.status === 204) return undefined as T
  const text = await res.text()
  return (text ? JSON.parse(text) : undefined) as T
}

export const ideologyKeys = {
  all: ['ideologies'] as const,
  list: (query: string, category: string) => ['ideologies', 'list', query, category] as const,
  detail: (id: string) => ['ideologies', 'detail', id] as const,
}

export const ideologyApi = {
  list: (params?: { query?: string; category?: IdeologyCategory }) => {
    const search = new URLSearchParams()
    if (params?.query?.trim()) search.set('q', params.query.trim())
    if (params?.category) search.set('category', params.category)
    const suffix = search.toString()
    return requestJson<IdeologyDto[]>(`/ideologies${suffix ? `?${suffix}` : ''}`)
  },
  getById: (id: string) => requestJson<IdeologyDto>(`/ideologies/${encodeURIComponent(id)}`),
  create: (body: IdeologyInput) =>
    requestJson<IdeologyDto>('/ideologies', { method: 'POST', body: JSON.stringify(body) }),
  update: (id: string, body: Partial<IdeologyInput>) =>
    requestJson<IdeologyDto>(`/ideologies/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify(body) }),
  delete: (id: string) => requestJson<void>(`/ideologies/${encodeURIComponent(id)}`, { method: 'DELETE' }),
}
