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

/**
 * 행정구역 소속 — 현대 국가(countryId) 또는 역사적 국가(historicalCountryId) 중 하나.
 */
export type DivisionOwner =
  | { countryId: string; historicalCountryId?: undefined }
  | { historicalCountryId: string; countryId?: undefined }

/** 행정구역 체계 (시기별 편제 — 예: 팔도제 1413–1895) */
export type AdminDivisionScheme = {
  id: string
  countryId: string | null
  historicalCountryId: string | null
  name: string
  description: string | null
  startDate: string | null
  endDate: string | null
  divisionCount: number
  /** 전체 목록(all) 조회 시 소속 국가 표시명 */
  ownerName?: string | null
}

export type CreateAdminDivisionSchemeInput = {
  countryId?: string | null
  historicalCountryId?: string | null
  name: string
  description?: string | null
  startDate?: string | null
  endDate?: string | null
}

export type UpdateAdminDivisionSchemeInput = {
  name?: string
  description?: string | null
  startDate?: string | null
  endDate?: string | null
}

export type AdministrativeDivision = {
  id: string
  name: string
  localName?: string | null
  nameMeaning?: string | null
  countryId: string | null
  historicalCountryId?: string | null
  adminDivisionId: string
  /** 소속 체계 ID. NULL이면 체계 미지정 */
  schemeId?: string | null
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
  countryId: string | null
  historicalCountryId?: string | null
  /** 소속 체계 ID. NULL이면 체계 공용 */
  schemeId?: string | null
  divisionLevel: number
  divisionLabel: string
  description: string | null
}

export type CreateAdminDivisionConfigInput = {
  countryId?: string | null
  historicalCountryId?: string | null
  schemeId?: string | null
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
  countryId?: string | null
  historicalCountryId?: string | null
  adminDivisionId: string
  schemeId?: string | null
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

/** 행정구역 서술 섹션 (제목 있는 다중 본문) */
export type AdminDivisionSection = {
  id: string
  title: string
  content: string
  order: number
}

export type AdminDivisionSectionInput = {
  title: string
  content: string
  order?: number
}

export type UpdateAdministrativeDivisionInput = {
  adminDivisionId?: string
  /** 소속 체계 변경 — null이면 해제 */
  schemeId?: string | null
  name?: string
  localName?: string | null
  nameMeaning?: string | null
  /** 서술 섹션 전체 교체 — undefined면 유지 */
  sections?: AdminDivisionSectionInput[]
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
  countryId: string | null
  historicalCountryId?: string | null
  schemeId?: string | null
  divisionLevel: number
  divisionLabel: string
  parentPath: string[]
  abolished: boolean
  centerLat: number | null
  centerLng: number | null
}

export type BulkCreateAdministrativeDivisionsInput = {
  countryId?: string | null
  historicalCountryId?: string | null
  schemeId?: string | null
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

  /** 행정구역 목록 조회 — 현대 국가 ID(string) 또는 owner 객체. schemeId로 체계 필터 */
  getAdministrativeDivisions: async (
    owner?: string | DivisionOwner,
    schemeId?: string | null,
  ): Promise<AdministrativeDivision[]> => {
    try {
      const params = new URLSearchParams()
      if (typeof owner === 'string') {
        params.set('countryId', owner)
      } else if (owner?.countryId) {
        params.set('countryId', owner.countryId)
      } else if (owner?.historicalCountryId) {
        params.set('historicalCountryId', owner.historicalCountryId)
      }
      if (schemeId) params.set('schemeId', schemeId)
      const res = await fetch(`${getBaseUrl()}/cities/administrative-divisions?${params}`, {
        headers: getHeaders(),
      })
      if (!res.ok) return []
      return await res.json()
    } catch {
      return []
    }
  },

  /** 행정구역 단위(레벨) 조회 — schemeId 지정 시 체계 전용 + 공용 함께 */
  getAdminDivisionConfigs: async (
    owner: string | DivisionOwner,
    schemeId?: string | null,
  ): Promise<AdminDivisionConfig[]> => {
    try {
      const params = new URLSearchParams()
      if (typeof owner === 'string') {
        params.set('countryId', owner)
      } else if (owner.countryId) {
        params.set('countryId', owner.countryId)
      } else if (owner.historicalCountryId) {
        params.set('historicalCountryId', owner.historicalCountryId)
      }
      if (schemeId) params.set('schemeId', schemeId)
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

  /** 행정구역 체계 목록 (owner 기준 또는 all=전체) */
  getAdminDivisionSchemes: async (
    owner: DivisionOwner | 'all',
  ): Promise<AdminDivisionScheme[]> => {
    try {
      const params = new URLSearchParams()
      if (owner === 'all') {
        params.set('all', 'true')
      } else if (owner.countryId) {
        params.set('countryId', owner.countryId)
      } else if (owner.historicalCountryId) {
        params.set('historicalCountryId', owner.historicalCountryId)
      }
      const res = await fetch(
        `${getBaseUrl()}/cities/admin-division-schemes?${params}`,
        { headers: getHeaders() },
      )
      if (!res.ok) return []
      return await res.json()
    } catch {
      return []
    }
  },

  createAdminDivisionScheme: async (
    input: CreateAdminDivisionSchemeInput,
  ): Promise<AdminDivisionScheme> => {
    const res = await fetch(`${getBaseUrl()}/cities/admin-division-schemes`, {
      method: 'POST',
      headers: { ...getHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    })
    if (!res.ok) throw new Error(await safeReadError(res))
    return await res.json()
  },

  updateAdminDivisionScheme: async (
    id: string,
    input: UpdateAdminDivisionSchemeInput,
  ): Promise<AdminDivisionScheme> => {
    const res = await fetch(
      `${getBaseUrl()}/cities/admin-division-schemes/${id}`,
      {
        method: 'PATCH',
        headers: { ...getHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      },
    )
    if (!res.ok) throw new Error(await safeReadError(res))
    return await res.json()
  },

  deleteAdminDivisionScheme: async (id: string): Promise<void> => {
    const res = await fetch(
      `${getBaseUrl()}/cities/admin-division-schemes/${id}`,
      { method: 'DELETE', headers: getHeaders() },
    )
    if (!res.ok && res.status !== 204) throw new Error(await safeReadError(res))
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

  /**
   * 행정구역 서술 섹션 조회 (order 순).
   * 실패를 []로 삼키면 React Query가 "섹션 없음"을 성공으로 캐시해
   * 다음 편집이 전체 배열 PATCH로 기존 서술을 지워버린다 — 반드시 throw.
   */
  getAdministrativeDivisionSections: async (
    id: string,
  ): Promise<AdminDivisionSection[]> => {
    const res = await fetch(
      `${getBaseUrl()}/cities/administrative-divisions/${id}/sections`,
      { headers: getHeaders() },
    )
    if (!res.ok) throw new Error(await safeReadError(res))
    return await res.json()
  },

  searchAdministrativeDivisions: async (
    q: string,
    owner: string | DivisionOwner,
    limit = 20,
    schemeId?: string | null,
  ): Promise<AdministrativeDivisionSearchHit[]> => {
    if (!q || q.trim().length < 1) return []
    try {
      const params = new URLSearchParams({
        q: q.trim(),
        limit: String(limit),
      })
      if (typeof owner === 'string') {
        params.set('countryId', owner)
      } else if (owner.countryId) {
        params.set('countryId', owner.countryId)
      } else if (owner.historicalCountryId) {
        params.set('historicalCountryId', owner.historicalCountryId)
      }
      if (schemeId) params.set('schemeId', schemeId)
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
