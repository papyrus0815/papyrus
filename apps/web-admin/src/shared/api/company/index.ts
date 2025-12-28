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

  create: async (data: CreateCompanyInput) => {
    console.log('Company API not implemented yet', data)
    return null
  },

  update: async (id: string, data: UpdateCompanyInput) => {
    console.log('Company API not implemented yet', id, data)
    return null
  },

  delete: async (id: string) => {
    console.log('Company API not implemented yet', id)
  },
}
