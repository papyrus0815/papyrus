import { apiConnection } from '../client'

export type AdministrationDepartment = {
  id: string
  name: string
  countryId: string
  parentId?: string | null
  description?: string | null
  createdAt: string
  updatedAt: string
}

export type CreateAdministrationDepartmentInput = {
  name: string
  countryId: string
  parentId?: string | null
  description?: string | null
}

export type UpdateAdministrationDepartmentInput = Partial<
  Omit<CreateAdministrationDepartmentInput, 'countryId'>
>

// API 엔드포인트가 없으므로 임시로 빈 배열 반환
export const administrationDepartmentApi = {
  getAll: async () => {
    return []
  },

  getByCountryId: async (countryId: string) => {
    return []
  },

  getById: async (id: string) => {
    return null
  },

  create: async (data: CreateAdministrationDepartmentInput) => {
    console.log('AdministrationDepartment API not implemented yet', data)
    return null
  },

  update: async (id: string, data: UpdateAdministrationDepartmentInput) => {
    console.log('AdministrationDepartment API not implemented yet', id, data)
    return null
  },

  delete: async (id: string) => {
    console.log('AdministrationDepartment API not implemented yet', id)
  },
}
