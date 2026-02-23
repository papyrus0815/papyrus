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

  create: async (_data: CreateEthnicityInput) => {
    return null
  },

  update: async (_id: string, _data: UpdateEthnicityInput) => {
    return null
  },

  delete: async (_id: string) => {},
}
