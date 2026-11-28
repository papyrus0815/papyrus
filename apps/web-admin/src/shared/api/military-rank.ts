import { getApiConnection } from './client'

export type MilitaryRankCategory =
  | 'MARSHAL'
  | 'GENERAL'
  | 'FIELD_OFFICER'
  | 'COMPANY_OFFICER'
  | 'WARRANT_OFFICER'
  | 'NCO'
  | 'ENLISTED'
  | 'TRADITIONAL'

export type MilitaryBranchCode =
  | 'ARMY'
  | 'NAVY'
  | 'AIR_FORCE'
  | 'MARINE_CORPS'
  | 'COAST_GUARD'
  | 'SPACE_FORCE'
  | 'JOINT'
  | 'OTHER'

export interface MilitaryRankDto {
  id: string
  name: string
  nameLocal: string | null
  nameEn: string | null
  abbreviation: string | null
  category: MilitaryRankCategory
  rankOrder: number
  natoCode: string | null
  branch: MilitaryBranchCode | null
  countryId: string | null
  historicalCountryId: string | null
  insigniaUrl: string | null
  description: string | null
  isUniversal: boolean
  country?: { id: string; name: string; flagEmoji?: string | null } | null
  historicalCountry?: { id: string; name: string } | null
}

export interface CreateMilitaryRankInput {
  name: string
  nameLocal?: string | null
  nameEn?: string | null
  abbreviation?: string | null
  category?: MilitaryRankCategory
  rankOrder?: number
  natoCode?: string | null
  branch?: MilitaryBranchCode | null
  countryId?: string | null
  historicalCountryId?: string | null
  isUniversal?: boolean
  insigniaUrl?: string | null
  description?: string | null
}

export interface PersonPromotionDto {
  id: string
  personId: string
  militaryRankId: string
  countryId: string | null
  historicalCountryId: string | null
  branch: MilitaryBranchCode | null
  era: 'BC' | 'AD' | null
  year: number | null
  month: number | null
  day: number | null
  precision: string | null
  isPosthumous: boolean
  isBrevet: boolean
  note: string | null
  militaryRank: MilitaryRankDto
}

export const MILITARY_RANK_CATEGORY_LABELS: Record<
  MilitaryRankCategory,
  string
> = {
  MARSHAL: '원수급',
  GENERAL: '장성·제독급',
  FIELD_OFFICER: '영관급',
  COMPANY_OFFICER: '위관급',
  WARRANT_OFFICER: '준사관',
  NCO: '부사관',
  ENLISTED: '병',
  TRADITIONAL: '전근대 무관·품계',
}

function unwrapList<T>(raw: unknown): T[] {
  if (Array.isArray(raw)) return raw as T[]
  if (
    raw &&
    typeof raw === 'object' &&
    Array.isArray((raw as { data?: unknown }).data)
  ) {
    return (raw as { data: T[] }).data
  }
  return []
}

function unwrapOne<T>(raw: unknown): T {
  if (
    raw &&
    typeof raw === 'object' &&
    'data' in (raw as Record<string, unknown>) &&
    (raw as { data?: unknown }).data
  ) {
    return (raw as { data: T }).data
  }
  return raw as T
}

async function requestJson(
  path: string,
  init?: RequestInit,
): Promise<unknown> {
  const conn = getApiConnection()
  const base = conn.host || 'http://localhost:8000'
  const res = await fetch(`${base}${path}`, {
    ...init,
    headers: {
      ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
      ...((conn.headers as Record<string, string> | undefined) ?? {}),
      ...((init?.headers as Record<string, string> | undefined) ?? {}),
    },
    credentials: 'include',
  })
  if (!res.ok) {
    const text = await res.text()
    let message = text
    try {
      const parsed = JSON.parse(text) as {
        message?: unknown
        error?: { message?: unknown }
      }
      const candidate = parsed.error?.message ?? parsed.message
      if (typeof candidate === 'string' && candidate.trim()) {
        message = candidate
      }
    } catch {
      /* raw text */
    }
    throw new Error(message || `군 계급 요청 실패 (HTTP ${res.status})`)
  }
  if (res.status === 204) return null
  const text = await res.text()
  return text ? JSON.parse(text) : null
}

export const militaryRankApi = {
  list: async (params?: {
    q?: string
    countryId?: string | null
    historicalCountryId?: string | null
    branch?: string | null
    category?: MilitaryRankCategory | null
    includeUniversal?: boolean
    limit?: number
  }): Promise<MilitaryRankDto[]> => {
    const sp = new URLSearchParams()
    if (params?.q?.trim()) sp.set('q', params.q.trim())
    if (params?.countryId?.trim()) sp.set('countryId', params.countryId.trim())
    if (params?.historicalCountryId?.trim()) {
      sp.set('historicalCountryId', params.historicalCountryId.trim())
    }
    if (params?.branch?.trim()) sp.set('branch', params.branch.trim())
    if (params?.category) sp.set('category', params.category)
    if (params?.includeUniversal === false) sp.set('includeUniversal', 'false')
    if (params?.limit != null) sp.set('limit', String(params.limit))
    const qs = sp.toString()
    const raw = await requestJson(`/military-ranks${qs ? `?${qs}` : ''}`)
    return unwrapList<MilitaryRankDto>(raw)
  },

  createOrResolve: async (
    body: CreateMilitaryRankInput,
  ): Promise<MilitaryRankDto> => {
    const raw = await requestJson('/military-ranks', {
      method: 'POST',
      body: JSON.stringify(body),
    })
    return unwrapOne<MilitaryRankDto>(raw)
  },

  update: async (
    id: string,
    body: Partial<CreateMilitaryRankInput>,
  ): Promise<MilitaryRankDto> => {
    const raw = await requestJson(`/military-ranks/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    })
    return unwrapOne<MilitaryRankDto>(raw)
  },

  remove: async (id: string): Promise<void> => {
    await requestJson(`/military-ranks/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    })
  },

  listPromotionsByPerson: async (
    personId: string,
  ): Promise<PersonPromotionDto[]> => {
    if (!personId) return []
    const raw = await requestJson(
      `/military-ranks/promotions/person/${encodeURIComponent(personId)}`,
    )
    return unwrapList<PersonPromotionDto>(raw)
  },

  addPromotion: async (body: {
    personId: string
    militaryRankId: string
    countryId?: string | null
    historicalCountryId?: string | null
    branch?: MilitaryBranchCode | null
    era?: 'BC' | 'AD' | null
    year?: number | null
    month?: number | null
    day?: number | null
    isPosthumous?: boolean
    isBrevet?: boolean
    note?: string | null
  }): Promise<PersonPromotionDto> => {
    const raw = await requestJson('/military-ranks/promotions', {
      method: 'POST',
      body: JSON.stringify(body),
    })
    return unwrapOne<PersonPromotionDto>(raw)
  },

  removePromotion: async (promotionId: string): Promise<void> => {
    await requestJson(
      `/military-ranks/promotions/${encodeURIComponent(promotionId)}`,
      { method: 'DELETE' },
    )
  },
}
