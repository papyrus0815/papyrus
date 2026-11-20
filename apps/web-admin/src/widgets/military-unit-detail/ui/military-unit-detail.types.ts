import type {
  MilitaryUnitDatePartsDto,
  MilitaryUnitEventLinkDto,
  MilitaryUnitLineageDto,
  MilitaryUnitTenureItem,
} from '@/shared/api/military-unit'

export interface MilitaryUnitDetailResponse {
  id: string
  name: string
  nameLocal?: string | null
  nameEn?: string | null
  abbreviation?: string | null
  unitType?: string | null
  branch?: string | null
  isActive?: boolean | null
  nickname?: string | null
  motto?: string | null
  garrison?: string | null
  strength?: string | null
  primaryMission?: string | null
  jurisdiction?: string | null
  notableBattles?: string | null
  honors?: string | null
  insigniaUrl?: string | null
  description?: string | null
  established?: MilitaryUnitDatePartsDto | null
  disbanded?: MilitaryUnitDatePartsDto | null
  establishedDate?: string | null
  disbandedDate?: string | null
  countryId?: string | null
  historicalCountryId?: string | null
  parentUnitId?: string | null
  administrationDepartmentId?: string | null
  country?: { id: string; name: string } | null
  historicalCountry?: { id: string; name: string } | null
  administrationDepartment?: {
    id: string
    name: string
    abbreviation?: string | null
  } | null
  parentUnit?: {
    id: string
    name: string
    abbreviation?: string | null
    unitType?: string | null
    parentUnitId?: string | null
    administrationDepartment?: {
      id: string
      name: string
      abbreviation?: string | null
    } | null
  } | null
  subUnits?: Array<{
    id: string
    name: string
    abbreviation?: string | null
    unitType?: string | null
    branch?: string | null
  }>
  predecessors?: MilitaryUnitLineageDto[]
  successors?: MilitaryUnitLineageDto[]
  tenures?: MilitaryUnitTenureItem[]
  commanders?: Array<{
    id: string
    tenureId?: string | null
    personId: string
    rank?: string | null
    role?: string | null
    startDate?: string | null
    endDate?: string | null
    isCurrent?: boolean
    person?: { id: string; name: string; surname?: string | null } | null
  }>
  assignedNavalVessels?: Array<{
    id: string
    name: string
    vesselType?: string | null
    vesselClass?: string | null
  }>
  navalVessels?: Array<{
    id: string
    name: string
    vesselType?: string | null
    vesselClass?: string | null
  }>
  eventRelations?: MilitaryUnitEventLinkDto[]
  sideDeployedUnits?: Array<{
    id: string
    role?: string | null
    note?: string | null
    parentUnit?: { id: string; name: string; unitType?: string | null } | null
    commander?: { id: string; name: string; surname?: string | null } | null
    deployedWeapons?: Array<{
      id: string
      quantity?: number | null
      note?: string | null
      weapon?: { id: string; name: string } | null
      aircraft?: { id: string; name: string } | null
      navalVessel?: { id: string; name: string } | null
      groundVehicle?: { id: string; name: string } | null
    }>
    weaponsUsed?: Array<{
      id: string
      quantity?: number | null
      note?: string | null
      weapon?: { id: string; name: string } | null
      aircraft?: { id: string; name: string } | null
      navalVessel?: { id: string; name: string } | null
      groundVehicle?: { id: string; name: string } | null
    }>
    mapFeatures?: Array<{
      id: string
      eventId: string
      title: string
      featureType: string
      description?: string | null
    }>
    metrics?: Array<{
      id: string
      metricName: string
      value?: number | null
      low?: number | null
      high?: number | null
      unit?: string | null
      approx?: boolean | null
    }>
    side?: {
      id: string
      name: string
      outcome?: string | null
      color?: string | null
      event?: {
        id: string
        title: string
        kind?: string | null
        startEra?: string | null
        startYear?: number | null
        startMonth?: number | null
        startDay?: number | null
        endEra?: string | null
        endYear?: number | null
        endMonth?: number | null
        endDay?: number | null
        startDate?: string | null
        parentEventId?: string | null
        parentEvent?: { id: string; title: string } | null
      } | null
    } | null
  }>
}

export type MilitaryUnitDetailVariant = 'page' | 'drawer' | 'embedded'

export interface CreateSubUnitDefaults {
  parentUnitId?: string | null
  countryId?: string | null
  historicalCountryId?: string | null
  administrationDepartmentId?: string | null
  branch?: string | null
}

export interface MilitaryUnitDetailActionsHandle {
  openAppointment: () => void
  openAddTransition: () => void
  openEventPicker: () => void
  deleteCurrentUnit: () => Promise<void>
}
