import * as jobCategoriesApi from '@api/functional/job_categories'
import { apiConnection } from '../client'

export type JobCategory = Awaited<
  ReturnType<typeof jobCategoriesApi.getAll>
>[number]

export const jobCategoryApi = {
  getAll: async () => {
    const result = await jobCategoriesApi.getAll(apiConnection)
    if (result && typeof result === 'object' && 'data' in result) {
      return Array.isArray((result as any).data) ? (result as any).data : []
    }
    return Array.isArray(result) ? result : []
  },

  getById: async (id: string) => {
    return await jobCategoriesApi.getById(apiConnection, id)
  },

  create: async (data: {
    name: string
    thumbnailUrl?: string
    parentId?: string
  }) => {
    return await jobCategoriesApi.create(apiConnection, data)
  },

  update: async (
    id: string,
    data: {
      name?: string
      thumbnailUrl?: string
      parentId?: string
    },
  ) => {
    return await jobCategoriesApi.update(apiConnection, id, data)
  },

  delete: async (id: string) => {
    await jobCategoriesApi._delete(apiConnection, id)
  },
}
