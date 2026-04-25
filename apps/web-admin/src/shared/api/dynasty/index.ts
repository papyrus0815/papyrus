import { useQuery } from '@tanstack/react-query'
import * as dynastiesApi from '@api/functional/dynasties'
import * as dynastyDetailApi from '@api/functional/dynasties/detail'
import { apiConnection } from '../client'

export type Dynasty = Awaited<ReturnType<typeof dynastiesApi.getAll>>[number]

/** detail SDK 타입을 가져올 수 없을 때(@api alias 미해결 환경) 대비 폴백 인터페이스 */
export interface DynastyDetailFallback {
  id: string
  name: string
  description: string | null
  startDate: string | null
  endDate: string | null
  thumbnailUrl: string | null
  originPlace: string | null
  founderId: string | null
  founder: {
    id: string
    name: string
    surname: string | null
    birthDate: string | null
    deathDate: string | null
  } | null
  founderText: string | null
  crestImageUrl: string | null
  motto: string | null
  createdAt: string
  updatedAt: string
  historicalRules: Array<{
    id: string
    historicalCountryId: string
    historicalCountryName: string
    startEra: string | null
    startYear: number | null
    endEra: string | null
    endYear: number | null
    endReason: string | null
    notes: string | null
  }>
  modernRules: Array<{
    id: string
    countryId: string
    countryName: string
    startEra: string | null
    startYear: number | null
    endEra: string | null
    endYear: number | null
    endReason: string | null
    notes: string | null
  }>
  memberCount: number
  members: Array<{
    id: string
    name: string
    surname: string | null
    birthDate: string | null
    deathDate: string | null
    profileImageUrl: string | null
  }>
}

export type DynastyDetail = DynastyDetailFallback

export type DynastyMutationBody = {
  name: string
  description?: string
  startDate?: string
  endDate?: string
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

  getDetail: async (id: string): Promise<DynastyDetail> => {
    return (await dynastyDetailApi.getDetail(apiConnection, id)) as DynastyDetail
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

export function useDynasties() {
  return useQuery({
    queryKey: ['dynasties'],
    queryFn: dynastyApi.getAll,
  })
}

export function useDynastyDetail(id: string | undefined) {
  return useQuery({
    queryKey: ['dynasty-detail', id],
    queryFn: () => dynastyApi.getDetail(id!),
    enabled: !!id,
  })
}
