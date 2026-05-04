import * as citiesApi from '@api/functional/cities'

import { getApiConnection, apiConnection } from '../client'

export type City = {
  id: string
  name: string
  countryId: string
  countryName?: string
  population?: number | null
  areaSqKm?: number | string | null
  administrativeDivisionId?: string | null
  administrativeDivisionName?: string | null
  createdAt?: string
  updatedAt?: string
}

export type AdministrativeDivision = {
  id: string
  name: string
  localName?: string | null
  nameMeaning?: string | null
  countryId: string
  adminDivisionId: string
  parentId?: string | null
  centerLat?: number | null
  centerLng?: number | null
  establishedDate?: string | null
  abolishedDate?: string | null
  predecessorId?: string | null
  cityCount?: number
  successorCount?: number
  children?: AdministrativeDivision[]
}

export type AdminDivisionConfig = {
  id: string
  countryId: string
  divisionLevel: number
  divisionLabel: string
  description: string | null
}

export type CreateAdminDivisionConfigInput = {
  countryId: string
  divisionLevel: number
  divisionLabel: string
  description?: string | null
}

export type UpdateAdminDivisionConfigInput = {
  divisionLevel?: number
  divisionLabel?: string
  description?: string | null
}

export type CreateAdministrativeDivisionInput = {
  countryId: string
  adminDivisionId: string
  name: string
  localName?: string | null
  nameMeaning?: string | null
  parentId?: string | null
  centerLat?: number | null
  centerLng?: number | null
  establishedDate?: string | null
  abolishedDate?: string | null
  predecessorId?: string | null
}

export type UpdateAdministrativeDivisionInput = {
  adminDivisionId?: string
  name?: string
  localName?: string | null
  nameMeaning?: string | null
  parentId?: string | null
  centerLat?: number | null
  centerLng?: number | null
  establishedDate?: string | null
  abolishedDate?: string | null
  predecessorId?: string | null
}

export type AdministrativeDivisionSearchHit = {
  id: string
  name: string
  localName: string | null
  countryId: string
  divisionLevel: number
  divisionLabel: string
  parentPath: string[]
  abolished: boolean
}

export type BulkCreateAdministrativeDivisionsInput = {
  countryId: string
  divisionLabel?: string
  adminDivisionId?: string
  divisionLevel: number
  parentId?: string | null
  items: Array<{
    name: string
    localName?: string | null
    nameMeaning?: string | null
    centerLat?: number | null
    centerLng?: number | null
  }>
}

export type BulkCreateResult = {
  created: number
  createdItems: Array<{ id: string; name: string }>
  skipped: Array<{ name: string; reason: string }>
}

export type PlaceSearchResult = {
  /** DB City.id (DB 등록 도시일 때만 존재) */
  cityId?: string
  placeId: string
  displayName: string
  shortName: string
  lat: number
  lng: number
  countryCode?: string
  country?: string
  region?: string
  city?: string
  /** DB에 등록된 도시 여부 */
  isRegistered?: boolean
}

export type CreateCityInput = {
  name: string
  countryId?: string | null
  population?: number | null
  areaSqKm?: number | null
  administrativeDivisionId?: string | null
}

export type UpdateCityInput = Partial<CreateCityInput>

async function fetchCities(params?: {
  countryId?: string
  administrativeDivisionId?: string
}): Promise<City[]> {
  try {
    const conn = getApiConnection()
    const data = await citiesApi.getCities(
      conn,
      params?.countryId,
      params?.administrativeDivisionId,
    )
    return Array.isArray(data) ? data : []
  } catch {
    return []
  }
}

const getBaseUrl = () => apiConnection.host || 'http://localhost:8000'
const getHeaders = () => apiConnection.headers as Record<string, string> | undefined

async function safeReadError(res: Response): Promise<string> {
  try {
    const data = await res.json()
    return (data as { message?: string }).message ?? `요청 실패 (${res.status})`
  } catch {
    return `요청 실패 (${res.status})`
  }
}

export const cityApi = {
  getAll: async () => fetchCities(),

  getByCountryId: async (countryId: string) => fetchCities({ countryId }),

  getByAdministrativeDivisionId: async (administrativeDivisionId: string) =>
    fetchCities({ administrativeDivisionId }),

  getById: async (id: string): Promise<City | null> => {
    const list = await fetchCities()
    return list.find((c) => c.id === id) ?? null
  },

  /** DB 도시 이름 검색 (부분 일치) */
  searchCities: async (q: string, countryId?: string): Promise<City[]> => {
    if (!q || q.trim().length < 1) return []
    try {
      const params = new URLSearchParams({ q: q.trim() })
      if (countryId) params.set('countryId', countryId)
      const res = await fetch(`${getBaseUrl()}/cities/search?${params}`, {
        headers: getHeaders(),
      })
      if (!res.ok) return []
      return await res.json()
    } catch {
      return []
    }
  },

  /** 행정구역 목록 조회 */
  getAdministrativeDivisions: async (countryId?: string): Promise<AdministrativeDivision[]> => {
    try {
      const params = new URLSearchParams()
      if (countryId) params.set('countryId', countryId)
      const res = await fetch(`${getBaseUrl()}/cities/administrative-divisions?${params}`, {
        headers: getHeaders(),
      })
      if (!res.ok) return []
      return await res.json()
    } catch {
      return []
    }
  },

  /** 행정구역 단위(레벨) 조회 */
  getAdminDivisionConfigs: async (
    countryId: string,
  ): Promise<AdminDivisionConfig[]> => {
    try {
      const params = new URLSearchParams({ countryId })
      const res = await fetch(
        `${getBaseUrl()}/cities/admin-division-configs?${params}`,
        { headers: getHeaders() },
      )
      if (!res.ok) return []
      return await res.json()
    } catch {
      return []
    }
  },

  createAdminDivisionConfig: async (
    input: CreateAdminDivisionConfigInput,
  ): Promise<AdminDivisionConfig> => {
    const res = await fetch(`${getBaseUrl()}/cities/admin-division-configs`, {
      method: 'POST',
      headers: { ...getHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    })
    if (!res.ok) throw new Error(await safeReadError(res))
    return await res.json()
  },

  updateAdminDivisionConfig: async (
    id: string,
    input: UpdateAdminDivisionConfigInput,
  ): Promise<AdminDivisionConfig> => {
    const res = await fetch(
      `${getBaseUrl()}/cities/admin-division-configs/${id}`,
      {
        method: 'PATCH',
        headers: { ...getHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      },
    )
    if (!res.ok) throw new Error(await safeReadError(res))
    return await res.json()
  },

  deleteAdminDivisionConfig: async (id: string): Promise<void> => {
    const res = await fetch(
      `${getBaseUrl()}/cities/admin-division-configs/${id}`,
      { method: 'DELETE', headers: getHeaders() },
    )
    if (!res.ok && res.status !== 204) throw new Error(await safeReadError(res))
  },

  createAdministrativeDivision: async (
    input: CreateAdministrativeDivisionInput,
  ): Promise<AdministrativeDivision> => {
    const res = await fetch(
      `${getBaseUrl()}/cities/administrative-divisions`,
      {
        method: 'POST',
        headers: { ...getHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      },
    )
    if (!res.ok) throw new Error(await safeReadError(res))
    return await res.json()
  },

  updateAdministrativeDivision: async (
    id: string,
    input: UpdateAdministrativeDivisionInput,
  ): Promise<AdministrativeDivision> => {
    const res = await fetch(
      `${getBaseUrl()}/cities/administrative-divisions/${id}`,
      {
        method: 'PATCH',
        headers: { ...getHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      },
    )
    if (!res.ok) throw new Error(await safeReadError(res))
    return await res.json()
  },

  deleteAdministrativeDivision: async (id: string): Promise<void> => {
    const res = await fetch(
      `${getBaseUrl()}/cities/administrative-divisions/${id}`,
      { method: 'DELETE', headers: getHeaders() },
    )
    if (!res.ok && res.status !== 204) throw new Error(await safeReadError(res))
  },

  searchAdministrativeDivisions: async (
    q: string,
    countryId: string,
    limit = 20,
  ): Promise<AdministrativeDivisionSearchHit[]> => {
    if (!q || q.trim().length < 1) return []
    try {
      const params = new URLSearchParams({
        q: q.trim(),
        countryId,
        limit: String(limit),
      })
      const res = await fetch(
        `${getBaseUrl()}/cities/administrative-divisions/search?${params}`,
        { headers: getHeaders() },
      )
      if (!res.ok) return []
      return await res.json()
    } catch {
      return []
    }
  },

  bulkCreateAdministrativeDivisions: async (
    input: BulkCreateAdministrativeDivisionsInput,
  ): Promise<BulkCreateResult> => {
    const res = await fetch(
      `${getBaseUrl()}/cities/administrative-divisions/bulk`,
      {
        method: 'POST',
        headers: { ...getHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      },
    )
    if (!res.ok) throw new Error(await safeReadError(res))
    return await res.json()
  },

  /** OpenStreetMap Nominatim 장소 검색 (백엔드 프록시) */
  searchPlaces: async (q: string, countryCode?: string): Promise<PlaceSearchResult[]> => {
    if (!q || q.trim().length < 2) return []
    try {
      const params = new URLSearchParams({ q: q.trim() })
      if (countryCode) params.set('countryCode', countryCode)
      const res = await fetch(`${getBaseUrl()}/cities/place-search?${params}`, {
        headers: getHeaders(),
      })
      if (!res.ok) return []
      return await res.json()
    } catch {
      return []
    }
  },

  create: async (_data: CreateCityInput) => {
    return null
  },

  update: async (_id: string, _data: UpdateCityInput) => {
    return null
  },

  delete: async (_id: string) => {},
}
