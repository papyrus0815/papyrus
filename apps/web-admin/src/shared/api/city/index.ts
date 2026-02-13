import { apiConnection } from '../client'

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

async function fetchCities(params?: { countryId?: string; administrativeDivisionId?: string }): Promise<City[]> {
  const url = new URL(`${apiConnection.host}/cities`)
  if (params?.countryId) url.searchParams.set('countryId', params.countryId)
  if (params?.administrativeDivisionId) url.searchParams.set('administrativeDivisionId', params.administrativeDivisionId)
  const res = await fetch(url.toString())
  if (!res.ok) return []
  const data = await res.json()
  return Array.isArray(data) ? data : []
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

  create: async (data: CreateCityInput) => {
    console.log('City API create not implemented yet', data)
    return null
  },

  update: async (id: string, data: UpdateCityInput) => {
    console.log('City API update not implemented yet', id, data)
    return null
  },

  delete: async (id: string) => {
    console.log('City API delete not implemented yet', id)
  },
}
