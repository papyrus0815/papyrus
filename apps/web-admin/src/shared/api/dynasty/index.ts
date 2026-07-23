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
  /** 가문 성립 사유. `null`이면 비움. 생략 시 기존값 유지 (편집 시) */
  startReason?: string | null
  /** 가문 단절 사유. `null`이면 비움. 생략 시 기존값 유지 (편집 시) */
  endReason?: string | null
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

  // 로컬 타입은 null 허용(해제 의도) — 서버 CreateDynastyDto와의 차이는 단언으로 통과
  create: async (data: DynastyMutationBody) => {
    return await dynastiesApi.create(
      apiConnection,
      data as Parameters<typeof dynastiesApi.create>[1],
    )
  },

  update: async (id: string, data: Partial<DynastyMutationBody>) => {
    return await dynastiesApi.update(apiConnection, id, data)
  },

  delete: async (id: string) => {
    await dynastiesApi._delete(apiConnection, id)
  },
}
