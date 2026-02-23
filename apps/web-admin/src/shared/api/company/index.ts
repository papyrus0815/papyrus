import { apiConnection } from '../client'

export type Company = {
  id: string
  name: string
  foundedAt?: string | null
  description?: string | null
  founderId?: string | null
  createdAt: string
  updatedAt: string
}

export type CreateCompanyInput = {
  name: string
  foundedAt?: string | null
  description?: string | null
  founderId?: string | null
}

export type UpdateCompanyInput = Partial<CreateCompanyInput>

// API 엔드포인트가 없으므로 임시로 빈 배열 반환
export const companyApi = {
  getAll: async () => {
    return []
  },

  getById: async (id: string) => {
    return null
  },

  create: async (_data: CreateCompanyInput) => {
    return null
  },

  update: async (_id: string, _data: UpdateCompanyInput) => {
    return null
  },

  delete: async (_id: string) => {},
}
