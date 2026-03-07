import * as citiesApi from '@api/functional/cities'

import { getApiConnection } from '../client'

export type City = {
  id: string
  name: string
  countryId: string
  countryName?: string
  population?: number | null
  areaSqKm?: number | string | null
  administrativeDivisionId?: string | null
  createdAt?: string
  updatedAt?: string
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

export const cityApi = {
  getAll: async () => fetchCities(),

  getByCountryId: async (countryId: string) => fetchCities({ countryId }),

  getByAdministrativeDivisionId: async (administrativeDivisionId: string) =>
    fetchCities({ administrativeDivisionId }),

  getById: async (id: string): Promise<City | null> => {
    const list = await fetchCities()
    return list.find((c) => c.id === id) ?? null
  },

  create: async (_data: CreateCityInput) => {
    return null
  },

  update: async (_id: string, _data: UpdateCityInput) => {
    return null
  },

  delete: async (_id: string) => {},
}
