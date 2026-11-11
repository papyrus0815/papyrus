import * as militaryUnitsApi from '@api/functional/military_units'

import type {
  CreateMilitaryUnitTransitionDto,
  MilitaryBranch,
  MilitaryUnitDateInput,
  MilitaryUnitDatePartsDto,
  MilitaryUnitDto,
  MilitaryUnitEventLinkDto,
  MilitaryUnitLineageDto,
  MilitaryUnitTransitionKind,
  MilitaryUnitType as ServerMilitaryUnitType,
  UpdateMilitaryUnitTransitionDto,
} from '../../../../api/src/libs/military/military-unit/presentation/dto'
import type { AdministrationDepartmentTenureItem } from '../administration-department'
import { apiConnection, getApiConnection } from '../client'

export type MilitaryUnit = MilitaryUnitDto
export type MilitaryUnitType = ServerMilitaryUnitType
export type {
  CreateMilitaryUnitTransitionDto,
  MilitaryBranch,
  MilitaryUnitDateInput,
  MilitaryUnitDatePartsDto,
  MilitaryUnitEventLinkDto,
  MilitaryUnitLineageDto,
  MilitaryUnitTransitionKind,
  UpdateMilitaryUnitTransitionDto,
}
export type CreateMilitaryUnitInput = Parameters<
  typeof militaryUnitsApi.create
>[1]
export type UpdateMilitaryUnitInput = Parameters<
  typeof militaryUnitsApi.update
>[2]

export type MilitaryUnitTenureItem = AdministrationDepartmentTenureItem & {
  militaryUnitId?: string | null
}

async function fetchMilitaryJsonList<T>(path: string): Promise<T[]> {
  const conn = getApiConnection()
  const url = `${conn.host}${path}`
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(conn.headers as Record<string, string>),
  }
  const response = await fetch(url, { method: 'GET', headers })
  if (!response.ok) {
    const text = await response.text()
    throw new Error(text || `HTTP ${response.status}`)
  }
  const list = (await response.json()) as T[]
  return Array.isArray(list) ? list : []
}

export const militaryUnitApi = {
  getAll: async (params?: {
    countryId?: string
    historicalCountryId?: string
    search?: string
    unitType?: string
    branch?: string
  }): Promise<MilitaryUnit[]> => {
    const result = await militaryUnitsApi.getAll(
      getApiConnection(),
      params?.countryId,
      params?.historicalCountryId,
      params?.search,
      params?.unitType,
      params?.branch,
    )
    if (result && typeof result === 'object' && 'data' in result) {
      const nested = (result as { data?: unknown }).data
      return Array.isArray(nested) ? (nested as MilitaryUnit[]) : []
    }
    return Array.isArray(result) ? (result as MilitaryUnit[]) : []
  },

  getByCountryId: async (countryId: string): Promise<MilitaryUnit[]> => {
    const result = await militaryUnitsApi.country.getByCountryId(
      getApiConnection(),
      countryId,
    )
    return Array.isArray(result) ? (result as MilitaryUnit[]) : []
  },

  getByHistoricalCountryId: async (
    historicalCountryId: string,
  ): Promise<MilitaryUnit[]> => {
    return militaryUnitApi.getAll({ historicalCountryId })
  },

  getById: async (id: string): Promise<MilitaryUnit> => {
    return (await militaryUnitsApi.getById(
      apiConnection,
      id,
    )) as MilitaryUnit
  },

  create: async (data: CreateMilitaryUnitInput): Promise<MilitaryUnit> => {
    return (await militaryUnitsApi.create(
      getApiConnection(),
      data,
    )) as MilitaryUnit
  },

  update: async (
    id: string,
    data: UpdateMilitaryUnitInput,
  ): Promise<MilitaryUnit> => {
    return (await militaryUnitsApi.update(
      getApiConnection(),
      id,
      data,
    )) as MilitaryUnit
  },

  delete: async (id: string): Promise<void> => {
    await militaryUnitsApi._delete(getApiConnection(), id)
  },

  addTransition: async (
    unitId: string,
    data: CreateMilitaryUnitTransitionDto,
  ): Promise<MilitaryUnit> => {
    return (await militaryUnitsApi.transitions.addTransition(
      getApiConnection(),
      unitId,
      data,
    )) as MilitaryUnit
  },

  updateTransition: async (
    transitionId: string,
    data: UpdateMilitaryUnitTransitionDto,
  ): Promise<void> => {
    await militaryUnitsApi.transitions.updateTransition(
      getApiConnection(),
      transitionId,
      data,
    )
  },

  deleteTransition: async (transitionId: string): Promise<void> => {
    await militaryUnitsApi.transitions.deleteTransition(
      getApiConnection(),
      transitionId,
    )
  },

  getTenures: async (unitId: string): Promise<MilitaryUnitTenureItem[]> => {
    return fetchMilitaryJsonList<MilitaryUnitTenureItem>(
      `/military-units/${encodeURIComponent(unitId)}/tenures`,
    )
  },

  getEvents: async (unitId: string): Promise<MilitaryUnitEventLinkDto[]> => {
    return fetchMilitaryJsonList<MilitaryUnitEventLinkDto>(
      `/military-units/${encodeURIComponent(unitId)}/events`,
    )
  },
}
