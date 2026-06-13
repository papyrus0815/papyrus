import { useQuery } from '@tanstack/react-query'
import * as jobsApi from '@api/functional/jobs'
import { apiConnection } from '../client'

export type Job = Awaited<ReturnType<typeof jobsApi.getAll>>[number]

export const jobApi = {
  getAll: async () => {
    const result = await jobsApi.getAll(apiConnection)
    // 응답이 { data: [...] } 형태인 경우 data 추출
    if (result && typeof result === 'object' && 'data' in result) {
      return Array.isArray((result as any).data) ? (result as any).data : []
    }
    // 직접 배열인 경우
    return Array.isArray(result) ? result : []
  },

  getById: async (id: string) => {
    return await jobsApi.getById(apiConnection, id)
  },

  create: async (data: {
    title: string
    description?: string
    thumbnailUrl?: string
    categoryId: string
  }) => {
    return await jobsApi.create(apiConnection, data)
  },

  update: async (
    id: string,
    data: {
      title?: string
      description?: string
      thumbnailUrl?: string
      categoryId?: string
    },
  ) => {
    return await jobsApi.update(apiConnection, id, data)
  },

  delete: async (id: string) => {
    await jobsApi._delete(apiConnection, id)
  },
}

export function useJobs() {
  return useQuery({
    queryKey: ['jobs'],
    queryFn: jobApi.getAll,
  })
}
