import { getApiConnection } from './client'
import {
  MENTION_TYPE_CONFIG,
  type MentionEntityType,
  type MentionItem,
} from '@/shared/lib/mention/mention-system'

export type EntityLinkSearchRow = {
  type: MentionEntityType
  id: string
  name: string
  subtitle?: string | null
  countryId?: string | null
}

async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  const conn = getApiConnection()
  const base = conn.host.replace(/\/$/, '')
  const url = `${base}${path.startsWith('/') ? path : `/${path}`}`
  const headers = new Headers()
  if (conn.headers) {
    for (const [headerKey, headerValue] of Object.entries(conn.headers)) {
      if (headerValue != null && headerValue !== '')
        headers.set(headerKey, String(headerValue))
    }
  }
  const fetchFn = conn.fetch ?? fetch
  const res = await fetchFn(url, {
    credentials: conn.options?.credentials ?? 'include',
    headers,
    ...init,
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
  return res.json() as Promise<T>
}

/** 서버 통합 검색 — `q`는 최소 1글자 */
export async function fetchEntityLinkSearch(params: {
  q: string
  countryId?: string
  /** 취소 시 이전 요청 결과가 목록을 덮지 않도록 함 */
  signal?: AbortSignal
}): Promise<EntityLinkSearchRow[]> {
  const q = params.q.trim()
  if (q.length < 1) return []
  const sp = new URLSearchParams()
  sp.set('q', q)
  if (params.countryId?.trim())
    sp.set('countryId', params.countryId.trim())
  const data = await requestJson<{ items: EntityLinkSearchRow[] }>(
    `/entity-link-search?${sp.toString()}`,
    { signal: params.signal },
  )
  return data.items ?? []
}

export function mapEntityLinkRowsToMentionItems(
  rows: EntityLinkSearchRow[],
): MentionItem[] {
  return rows.map((row) => {
    const cfg = MENTION_TYPE_CONFIG[row.type]
    return {
      type: row.type,
      id: row.id,
      name: row.name,
      subtitle: row.subtitle ?? undefined,
      icon: cfg.icon,
      color: cfg.color,
      data:
        row.type === 'politicalParty'
          ? { id: row.id, countryId: row.countryId ?? null }
          : { id: row.id },
    }
  })
}
