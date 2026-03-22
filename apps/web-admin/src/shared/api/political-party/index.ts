import { getPoliticalParties as fetchParties, type PoliticalPartyRow } from '../election'

export type PoliticalPosition =
  | 'FAR_LEFT'
  | 'LEFT'
  | 'CENTER_LEFT'
  | 'CENTER'
  | 'CENTER_RIGHT'
  | 'RIGHT'
  | 'FAR_RIGHT'
  | 'BIG_TENT'

export type PoliticalParty = PoliticalPartyRow & {
  localName?: string | null
  ideology?: string | null
  position?: PoliticalPosition | null
  description?: string | null
  foundedDate?: string | null
  dissolvedDate?: string | null
  logoUrl?: string | null
  createdAt?: string
  updatedAt?: string
}

export type CreatePoliticalPartyInput = {
  name: string
  shortName?: string | null
  localName?: string | null
  ideology?: string | null
  position?: PoliticalPosition | null
  description?: string | null
  foundedDate?: string | null
  dissolvedDate?: string | null
  logoUrl?: string | null
  countryId?: string | null
  /** 역사적 국가 맥락의 정당 (현대 국가와 배타적으로 쓰는 경우가 많음) */
  historicalCountryId?: string | null
}

export type UpdatePoliticalPartyInput = Partial<CreatePoliticalPartyInput>

import { getApiConnection } from '../client'

async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  const conn = getApiConnection()
  const base = conn.host.replace(/\/$/, '')
  const url = `${base}${path.startsWith('/') ? path : `/${path}`}`
  const headers = new Headers()
  headers.set('Content-Type', 'application/json')
  if (conn.headers) {
    for (const [headerKey, headerValue] of Object.entries(conn.headers)) {
      if (headerValue != null && headerValue !== '')
        headers.set(headerKey, String(headerValue))
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

export const politicalPartyApi = {
  getAll: async (params?: { countryId?: string; historicalCountryId?: string }) => {
    return fetchParties(params) as Promise<PoliticalParty[]>
  },

  getByCountryId: async (countryId: string) => {
    return fetchParties({ countryId }) as Promise<PoliticalParty[]>
  },

  getById: async (id: string) => {
    return requestJson<PoliticalParty>(`/political-parties/${encodeURIComponent(id)}`)
  },

  create: async (data: CreatePoliticalPartyInput) => {
    return requestJson<PoliticalParty>('/political-parties', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  update: async (id: string, data: UpdatePoliticalPartyInput) => {
    return requestJson<PoliticalParty>(`/political-parties/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    })
  },

  delete: async (id: string) => {
    await requestJson<void>(`/political-parties/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    })
  },
}
