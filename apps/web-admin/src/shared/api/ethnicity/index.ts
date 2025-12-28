import { apiConnection } from '../client'

export type Ethnicity = {
  id: string
  name: string
  description?: string | null
  thumbnailUrl?: string | null
  createdAt: string
  updatedAt: string
}

export type CreateEthnicityInput = {
  name: string
  description?: string | null
  thumbnailUrl?: string | null
}

export type UpdateEthnicityInput = Partial<CreateEthnicityInput>

// API 엔드포인트가 없으므로 임시로 빈 배열 반환
export const ethnicityApi = {
  getAll: async () => {
    return []
  },

  getById: async (id: string) => {
    return null
  },

  create: async (data: CreateEthnicityInput) => {
    console.log('Ethnicity API not implemented yet', data)
    return null
  },

  update: async (id: string, data: UpdateEthnicityInput) => {
    console.log('Ethnicity API not implemented yet', id, data)
    return null
  },

  delete: async (id: string) => {
    console.log('Ethnicity API not implemented yet', id)
  },
}
