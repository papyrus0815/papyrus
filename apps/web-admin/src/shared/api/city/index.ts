import { apiConnection } from '../client'

export type City = {
  id: string
  name: string
  countryId?: string | null
  population?: number | null
  areaSqKm?: number | null
  administrativeDivisionId?: string | null
  createdAt: string
  updatedAt: string
}

export type CreateCityInput = {
  name: string
  countryId?: string | null
  population?: number | null
  areaSqKm?: number | null
  administrativeDivisionId?: string | null
}

export type UpdateCityInput = Partial<CreateCityInput>

// API 엔드포인트가 없으므로 임시로 빈 배열 반환
// 실제 API가 생성되면 연동 필요
export const cityApi = {
  getAll: async () => {
    return []
  },

  getByCountryId: async (countryId: string) => {
    return []
  },

  getById: async (id: string) => {
    return null
  },

  create: async (data: CreateCityInput) => {
    console.log('City API not implemented yet', data)
    return null
  },

  update: async (id: string, data: UpdateCityInput) => {
    console.log('City API not implemented yet', id, data)
    return null
  },

  delete: async (id: string) => {
    console.log('City API not implemented yet', id)
  },
}
