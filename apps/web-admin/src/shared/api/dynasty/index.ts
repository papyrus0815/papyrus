import { useQuery } from '@tanstack/react-query'
import * as dynastiesApi from '@api/functional/dynasties'
import { apiConnection } from '../client'

export type Dynasty = Awaited<ReturnType<typeof dynastiesApi.getAll>>[number]

export const dynastyApi = {
  getAll: async () => {
    const result = await dynastiesApi.getAll(apiConnection)
    // 응답이 { data: [...] } 형태인 경우 data 추출
    if (result && typeof result === 'object' && 'data' in result) {
      return Array.isArray((result as any).data) ? (result as any).data : []
    }
    // 직접 배열인 경우
    return Array.isArray(result) ? result : []
  },

  getById: async (id: string) => {
    return await dynastiesApi.getById(apiConnection, id)
  },

  create: async (data: {
    name: string
    description?: string
    startDate?: string
    endDate?: string
    thumbnailUrl?: string
  }) => {
    return await dynastiesApi.create(apiConnection, data)
  },

  update: async (
    id: string,
    data: {
      name?: string
      description?: string
      startDate?: string
      endDate?: string
      thumbnailUrl?: string
    },
  ) => {
    return await dynastiesApi.update(apiConnection, id, data)
  },

  delete: async (id: string) => {
    await dynastiesApi.$delete(apiConnection, id)
  },
}

export function useDynasties() {
  return useQuery({
    queryKey: ['dynasties'],
    queryFn: dynastyApi.getAll,
  })
}
