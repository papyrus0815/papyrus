import * as militaryUnitsApi from '@api/functional/military_units'
import { apiConnection } from '../client'

export type MilitaryUnitType =
  | 'FIELD_ARMY'
  | 'CORPS'
  | 'DIVISION'
  | 'BRIGADE'
  | 'REGIMENT'
  | 'BATTALION'
  | 'COMPANY'
  | 'PLATOON'
  | 'SQUAD'
  | 'FLEET'
  | 'SQUADRON'
  | 'WING'
  | 'SPECIAL_FORCES'
  | 'DETACHMENT'
  | 'OTHER'

export type MilitaryUnit = {
  id: string
  name: string
  unitType?: MilitaryUnitType | null
  countryId?: string | null
  isActive?: boolean | null
  establishedDate?: string | null
  disbandedDate?: string | null
  parentUnitId?: string | null
  description?: string | null
  createdAt: string
  updatedAt: string
  country?: {
    id: string
    name: string
    flagEmoji?: string | null
  } | null
  parentUnit?: {
    id: string
    name: string
    unitType?: MilitaryUnitType | null
  } | null
  subUnits?: Array<{
    id: string
    name: string
    unitType?: MilitaryUnitType | null
    isActive?: boolean | null
  }>
  commanders?: Array<{
    id: string
    personId: string
    rank?: string | null
    role?: string | null
    isCurrent?: boolean | null
    person?: {
      id: string
      name: string
      surname?: string | null
    }
  }>
}

export type CreateMilitaryUnitInput = {
  name: string
  unitType?: MilitaryUnitType | null
  countryId?: string | null
  isActive?: boolean | null
  establishedDate?: string | null
  disbandedDate?: string | null
  parentUnitId?: string | null
  description?: string | null
}

export type UpdateMilitaryUnitInput = {
  name?: string
  unitType?: MilitaryUnitType | null
  countryId?: string | null
  isActive?: boolean | null
  establishedDate?: string | null
  disbandedDate?: string | null
  parentUnitId?: string | null
  description?: string | null
}

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
