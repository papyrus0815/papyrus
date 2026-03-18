import * as militaryUnitsApi from '@api/functional/military_units'
import { apiConnection } from '../client'

// SDK 기반 타입 — 서버·클라이언트 동일 타입 사용
export type MilitaryUnit = Awaited<ReturnType<typeof militaryUnitsApi.getById>>
export type MilitaryUnitType = NonNullable<MilitaryUnit['unitType']>
export type CreateMilitaryUnitInput = Parameters<typeof militaryUnitsApi.create>[1]
export type UpdateMilitaryUnitInput = Parameters<typeof militaryUnitsApi.update>[2]

export const militaryUnitApi = {
  getAll: async () => {
    const result = await militaryUnitsApi.getAll(apiConnection)
    // 응답이 { data: [...] } 형태인 경우 data 추출
    if (result && typeof result === 'object' && 'data' in result) {
      return Array.isArray((result as any).data) ? (result as any).data : []
    }
    // 직접 배열인 경우
    return Array.isArray(result) ? result : []
  },

  getById: async (id: string) => {
    return await militaryUnitsApi.getById(apiConnection, id)
  },

  create: async (data: CreateMilitaryUnitInput) => {
    return await militaryUnitsApi.create(apiConnection, data)
  },

  update: async (id: string, data: UpdateMilitaryUnitInput) => {
    return await militaryUnitsApi.update(apiConnection, id, data)
  },

  delete: async (id: string) => {
    await militaryUnitsApi.$delete(apiConnection, id)
  },
}
