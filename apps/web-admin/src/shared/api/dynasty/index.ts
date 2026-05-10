import * as dynastiesApi from '@api/functional/dynasties'
import { apiConnection } from '../client'

export type Dynasty = Awaited<ReturnType<typeof dynastiesApi.getAll>>[number]

export type DynastyMutationBody = {
  name: string
  /** `null`이면 설명을 비움. 생략 시 기존값 유지 (편집 시) */
  description?: string | null
  /** `null`이면 시작일을 비움. 생략 시 기존값 유지 (편집 시) */
  startDate?: string | null
  /** `null`이면 종료일을 비움. 생략 시 기존값 유지 (편집 시) */
  endDate?: string | null
  thumbnailUrl?: string | null
  originPlace?: string | null
  founderId?: string | null
  founderText?: string | null
  crestImageUrl?: string | null
  motto?: string | null
}

export const dynastyApi = {
  getAll: async (): Promise<Dynasty[]> => {
    const result = await dynastiesApi.getAll(apiConnection)
    if (result && typeof result === 'object' && 'data' in result) {
      return Array.isArray((result as any).data) ? (result as any).data : []
    }
    return Array.isArray(result) ? result : []
  },

  getById: async (id: string): Promise<Dynasty> => {
    return await dynastiesApi.getById(apiConnection, id)
  },

  create: async (data: DynastyMutationBody) => {
    return await dynastiesApi.create(apiConnection, data)
  },

  update: async (id: string, data: Partial<DynastyMutationBody>) => {
    return await dynastiesApi.update(apiConnection, id, data)
  },

  delete: async (id: string) => {
    await dynastiesApi.$delete(apiConnection, id)
  },
}
