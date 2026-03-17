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
  countryId: string
  parentId?: string | null
  children?: AdministrativeDivision[]
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
