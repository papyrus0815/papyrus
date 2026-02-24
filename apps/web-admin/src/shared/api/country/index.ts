import * as countriesApi from '@api/functional/countries'
import { getApiConnection } from '../client'

export type Country = {
  id: string
  name: string
  localName?: string | null
  flagEmoji?: string | null
  isoCode?: string | null
  population?: number | null
  areaSqKm?: number | null
  thumbnailUrl?: string | null
  capital?: string | null
  createdAt: string
  updatedAt: string
}

export const countryApi = {
  getAll: async () => {
    const result = await countriesApi.getAllCountries(getApiConnection())
    // 응답이 { data: [...] } 형태인 경우 data 추출
    if (result && typeof result === 'object' && 'data' in result) {
      return Array.isArray((result as any).data) ? (result as any).data : []
    }
    // 직접 배열인 경우
    return Array.isArray(result) ? result : []
  },
  getById: async (id: string) => {
    return countriesApi.getCountryById(getApiConnection(), id)
  },
}

