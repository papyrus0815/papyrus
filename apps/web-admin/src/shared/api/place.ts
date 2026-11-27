/**
 * 범용 역사·지리 장소 정본(Place) 클라이언트 API
 */
import {
  type PlaceCoordinatePrecision,
  type PlaceKind,
  type PlaceSuggestion,
  type PlaceSummary,
} from '@/shared/lib/person-place-google-map.lib'

import { apiConnection } from './client'

export * from '@/shared/lib/person-place-google-map.lib'

export interface ResolvePlaceBody {
  id?: string | null
  kind?: PlaceKind | null
  name: string
  localName?: string | null
  modernAddress?: string | null
  description?: string | null
  latitude?: number | null
  longitude?: number | null
  coordinatePrecision?: PlaceCoordinatePrecision | null
  googlePlaceId?: string | null
  externalKey?: string | null
  defaultZoom?: number | null
  countryId?: string | null
  countryCode?: string | null
  historicalCountryId?: string | null
  administrativeDivisionId?: string | null
  aliases?: Array<{
    name: string
    kind?: 'MODERN' | 'HISTORICAL' | 'LOCAL' | 'ROMANIZED' | 'ALIAS'
    languageCode?: string | null
    historicalCountryId?: string | null
  }>
}

export interface PlaceMapConfig {
  googleMapsWebApiKey: string | null
  hasServerGooglePlacesKey: boolean
}

const getBaseUrl = () => apiConnection.host || 'http://localhost:8000'
const getHeaders = (): Record<string, string> => ({
  'Content-Type': 'application/json',
  ...((apiConnection.headers as Record<string, string> | undefined) ?? {}),
})

let cachedMapConfigPromise: Promise<PlaceMapConfig> | null = null

export const placeApi = {
  getConfig: (): Promise<PlaceMapConfig> => {
    if (!cachedMapConfigPromise) {
      cachedMapConfigPromise = fetch(`${getBaseUrl()}/places/config`, {
        headers: getHeaders(),
      })
        .then((res) => (res.ok ? res.json() : null))
        .then(
          (data): PlaceMapConfig => ({
            googleMapsWebApiKey: data?.googleMapsWebApiKey ?? null,
            hasServerGooglePlacesKey: Boolean(data?.hasServerGooglePlacesKey),
          }),
        )
        .catch(() => ({
          googleMapsWebApiKey: null,
          hasServerGooglePlacesKey: false,
        }))
    }
    return cachedMapConfigPromise
  },

  suggest: async (
    q: string,
    countryCode?: string,
    limit = 10,
  ): Promise<PlaceSuggestion[]> => {
    if (!q || q.trim().length < 2) return []
    try {
      const params = new URLSearchParams({
        q: q.trim(),
        limit: String(limit),
      })
      if (countryCode) params.set('countryCode', countryCode)
      const res = await fetch(`${getBaseUrl()}/places/suggest?${params}`, {
        headers: getHeaders(),
      })
      if (!res.ok) return []
      const data = await res.json()
      return Array.isArray(data) ? data : []
    } catch {
      return []
    }
  },

  list: async (params?: {
    q?: string
    kind?: PlaceKind
    countryId?: string
    limit?: number
  }): Promise<PlaceSummary[]> => {
    try {
      const sp = new URLSearchParams()
      if (params?.q) sp.set('q', params.q.trim())
      if (params?.kind) sp.set('kind', params.kind)
      if (params?.countryId) sp.set('countryId', params.countryId)
      if (params?.limit) sp.set('limit', String(params.limit))
      const res = await fetch(`${getBaseUrl()}/places?${sp}`, {
        headers: getHeaders(),
      })
      if (!res.ok) return []
      const data = await res.json()
      return Array.isArray(data) ? data : []
    } catch {
      return []
    }
  },

  resolve: async (body: ResolvePlaceBody): Promise<PlaceSummary> => {
    const res = await fetch(`${getBaseUrl()}/places/resolve`, {
      method: 'POST',
      headers: getHeaders(),
      credentials: 'include',
      body: JSON.stringify(body),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(
        (err as { message?: string }).message ??
          `장소 저장 실패 (${res.status})`,
      )
    }
    return res.json()
  },

  update: async (
    id: string,
    body: Partial<ResolvePlaceBody>,
  ): Promise<PlaceSummary> => {
    const res = await fetch(`${getBaseUrl()}/places/${id}`, {
      method: 'PATCH',
      headers: getHeaders(),
      credentials: 'include',
      body: JSON.stringify(body),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(
        (err as { message?: string }).message ??
          `장소 수정 실패 (${res.status})`,
      )
    }
    return res.json()
  },
}
