import type {
  OrganizationType,
  OrganizationScope,
  OrganizationCountryRole,
} from '@prisma/client'

/** 응답에 포함되는 연결 국가/역사국가 요약 (id→이름 별도 조회 없이 표시) */
export interface OrganizationCountryRefDto {
  id: string
  name: string
  flagEmoji?: string | null
}

export interface OrganizationLineageRefDto {
  id: string
  name: string
  shortName: string | null
}

export interface OrganizationResponseDto {
  id: string
  name: string
  shortName: string | null
  localName: string | null
  type: OrganizationType
  scope: OrganizationScope | null
  description: string | null
  foundedDate: string | null
  dissolvedDate: string | null
  websiteUrl: string | null
  logoUrl: string | null
  ideology: string | null
  headquartersCityId: string | null
  headquartersCity: { id: string; name: string } | null
  predecessorOrganizationId: string | null
  predecessor: OrganizationLineageRefDto | null
  successors: OrganizationLineageRefDto[]
  countryId: string | null
  historicalCountryId: string | null
  /** 현대 국가 요약(있으면) */
  country: OrganizationCountryRefDto | null
  /** 역사국가 요약(있으면) — 표시는 역사 우선 */
  historicalCountry: OrganizationCountryRefDto | null
  /** 가입 회원국·파트너국 수 */
  countryMemberCount: number
  /** 주관 정기 회의·행사 시리즈 수 */
  eventSeriesCount: number
  createdAt: string
  updatedAt: string
}

export interface OrganizationHierarchyResponseDto {
  id: string
  parentOrganizationId: string
  childOrganizationId: string
  relationType: string
  startDate: string | null
  endDate: string | null
  notes: string | null
}

export interface OrganizationTreeNodeResponseDto extends OrganizationResponseDto {
  children: OrganizationTreeNodeResponseDto[]
  parentIds: string[]
}

export interface OrganizationMemberResponseDto {
  id?: string
  personId: string
  roleTitle: string | null
  source: 'TENURE' | 'ROLE'
  person: {
    id: string
    name: string
    surname: string | null
    originalName: string | null
    profileImageUrl: string | null
  }
}

export interface OrganizationMembershipStatusPhaseResponseDto {
  role: OrganizationCountryRole
  startEra?: 'BC' | 'AD' | null
  startYear?: number | null
  endEra?: 'BC' | 'AD' | null
  endYear?: number | null
  notes?: string | null
}

export interface OrganizationCountryMembershipResponseDto {
  id: string
  organizationId: string
  countryId: string | null
  historicalCountryId: string | null
  role: OrganizationCountryRole
  startEra: 'BC' | 'AD' | null
  startYear: number | null
  startMonth: number | null
  startDay: number | null
  startDate: string | null
  endEra: 'BC' | 'AD' | null
  endYear: number | null
  endMonth: number | null
  endDay: number | null
  endDate: string | null
  sortOrder: number
  notes: string | null
  statusHistory: OrganizationMembershipStatusPhaseResponseDto[] | null
  country: { id: string; name: string; flagEmoji: string | null } | null
  historicalCountry: { id: string; name: string } | null
}

export interface CountryOrganizationMembershipResponseDto
  extends OrganizationCountryMembershipResponseDto {
  organization: {
    id: string
    name: string
    shortName: string | null
    type: OrganizationType
    scope: OrganizationScope | null
    logoUrl: string | null
    foundedDate: string | null
    dissolvedDate: string | null
    countryMemberCount: number
    eventSeriesCount: number
  }
}

export interface OrganizationRelatedEventResponseDto {
  id: string
  title: string
  startDate: string | null
  startDatePrecision: string | null
  endDate: string | null
  location: string | null
  domain: string
  type: string | null
  kind: 'SINGLE' | 'COLLECTION'
  organizationRole: string | null
  seriesId: string | null
  seriesTitle: string | null
  editionBadge: string | null
  hostCountry: {
    id: string
    name: string
    flagEmoji: string | null
    isHistorical: boolean
  } | null
  participantCount: number
}
