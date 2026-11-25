import * as militaryUnitsApi from '@api/functional/military_units'

import type { AdministrationDepartmentTenureItem } from '../administration-department'
import { getApiConnection } from '../client'

export type CreateMilitaryUnitInput = Parameters<
  typeof militaryUnitsApi.create
>[1]
export type UpdateMilitaryUnitInput = Parameters<
  typeof militaryUnitsApi.update
>[2]

export type MilitaryUnitType = NonNullable<CreateMilitaryUnitInput['unitType']>
export type MilitaryBranch = NonNullable<CreateMilitaryUnitInput['branch']>
export type MilitaryUnitJurisdictionGeometryDto = NonNullable<
  CreateMilitaryUnitInput['jurisdictionGeometry']
>

export type CreateMilitaryUnitTransitionDto = Parameters<
  typeof militaryUnitsApi.transitions.addTransition
>[2]
export type UpdateMilitaryUnitTransitionDto = Parameters<
  typeof militaryUnitsApi.transitions.updateTransition
>[2]
export type MilitaryUnitTransitionKind = CreateMilitaryUnitTransitionDto['kind']

export interface MilitaryUnitDatePartsDto {
  era: 'BC' | 'AD'
  year: number
  month: number | null
  day: number | null
  precision: string | null
}

export interface MilitaryUnitDateInput {
  era?: 'BC' | 'AD' | null
  year?: number | null
  month?: number | null
  day?: number | null
  precision?: string | null
}

export interface MilitaryUnitLineageDto {
  transitionId: string
  kind: MilitaryUnitTransitionKind
  era: 'BC' | 'AD' | null
  year: number | null
  month: number | null
  note: string | null
  targetType: 'MILITARY_UNIT' | 'DEPARTMENT'
  unit: {
    id: string
    name: string
    abbreviation: string | null
    unitType: MilitaryUnitType | null
  } | null
  department: {
    id: string
    name: string
    abbreviation: string | null
    kind: string
  } | null
}

export interface MilitaryUnitEventLinkDto {
  relationId: string
  role: string
  roleDescription?: string | null
  event: {
    id: string
    title: string
    startDate?: string | null
    endDate?: string | null
    startEra?: string | null
    startYear?: number | null
    startMonth?: number | null
    startDay?: number | null
    startDatePrecision?: string | null
    type?: string | null
    kind?: string | null
  }
}

export interface MilitaryUnitObservationDto {
  id: string
  metricKey: string
  metricName?: string
  metricLabelKo?: string
  unit?: string | null
  value?: string | null
  low?: string | null
  high?: string | null
  approx: boolean
  atLeast: boolean
  qualifier?: string | null
  note?: string | null
  estimateRole?: 'PREFERRED' | 'ALTERNATIVE' | 'DISPUTED' | null
  method?: 'COUNTED' | 'ESTIMATED' | 'EXTRAPOLATED' | 'OFFICIAL_CLAIM' | null
  start?: MilitaryUnitDatePartsDto | null
  end?: MilitaryUnitDatePartsDto | null
}

export interface MilitaryUnitDto {
  id: string
  name: string
  nameLocal?: string | null
  nameEn?: string | null
  abbreviation?: string | null
  unitType?: MilitaryUnitType | null
  branch?: MilitaryBranch | null
  countryId?: string | null
  historicalCountryId?: string | null
  isActive?: boolean | null
  established?: MilitaryUnitDatePartsDto | null
  disbanded?: MilitaryUnitDatePartsDto | null
  establishedDate?: string | null
  disbandedDate?: string | null
  parentUnitId?: string | null
  administrationDepartmentId?: string | null
  nickname?: string | null
  motto?: string | null
  garrison?: string | null
  garrisonLatitude?: number | null
  garrisonLongitude?: number | null
  strength?: string | null
  insigniaUrl?: string | null
  primaryMission?: string | null
  jurisdiction?: string | null
  jurisdictionGeometry?: MilitaryUnitJurisdictionGeometryDto | null
  notableBattles?: string | null
  honors?: string | null
  description?: string | null
  predecessors?: MilitaryUnitLineageDto[]
  successors?: MilitaryUnitLineageDto[]
  eventRelations?: MilitaryUnitEventLinkDto[]
  tenures?: MilitaryUnitTenureItem[]
  unitObservations?: MilitaryUnitObservationDto[]
  assignedNavalVessels?: Array<{
    id: string
    name: string
    vesselType?: string | null
  }>
  createdAt: string
  updatedAt: string
  country?: {
    id: string
    name: string
    flagEmoji?: string | null
  } | null
  historicalCountry?: {
    id: string
    name: string
    enName?: string | null
    startEra?: string | null
    startYear?: number | null
    endEra?: string | null
    endYear?: number | null
  } | null
  parentUnit?: {
    id: string
    name: string
    abbreviation?: string | null
    unitType?: MilitaryUnitType | null
  } | null
  administrationDepartment?: {
    id: string
    name: string
    abbreviation?: string | null
    kind?: string | null
  } | null
  subUnits?: Array<{
    id: string
    name: string
    abbreviation?: string | null
    unitType?: MilitaryUnitType | null
    branch?: MilitaryBranch | null
    isActive?: boolean | null
    garrison?: string | null
    garrisonLatitude?: number | null
    garrisonLongitude?: number | null
  }>
  commanders?: Array<{
    id: string
    tenureId?: string | null
    personId: string
    rank?: string | null
    role?: string | null
    isCurrent?: boolean | null
    startDate?: string | null
    endDate?: string | null
    termNumber?: number | null
    person?: {
      id: string
      name: string
      surname?: string | null
    }
  }>
  sideDeployedUnits?: Array<{
    id: string
    role?: string | null
    note?: string | null
    parentUnitId?: string | null
    commanderId?: string | null
    side: {
      id: string
      name: string
      outcome?: string | null
      event: {
        id: string
        title: string
        startDate?: string | null
        endDate?: string | null
        kind?: string | null
        type?: string | null
      }
    }
  }>
  _count?: {
    subUnits?: number
    commanders?: number
    tenures?: number
    eventRelations?: number
    sideDeployedUnits?: number
  }
}

export type MilitaryUnit = MilitaryUnitDto

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
    summary?: boolean
  }): Promise<MilitaryUnit[]> => {
    if (params?.summary) {
      const query = new URLSearchParams()
      if (params.countryId) query.set('countryId', params.countryId)
      if (params.historicalCountryId) {
        query.set('historicalCountryId', params.historicalCountryId)
      }
      if (params.search) query.set('search', params.search)
      if (params.unitType) query.set('unitType', params.unitType)
      if (params.branch) query.set('branch', params.branch)
      query.set('summary', '1')
      return fetchMilitaryJsonList<MilitaryUnit>(
        `/military-units?${query.toString()}`,
      )
    }
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
      getApiConnection(),
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
