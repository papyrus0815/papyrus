import type { OrganizationType, OrganizationScope } from '@prisma/client'

/** 응답에 포함되는 연결 국가/역사국가 요약 (id→이름 별도 조회 없이 표시) */
export interface OrganizationCountryRefDto {
  id: string
  name: string
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
  countryId: string | null
  historicalCountryId: string | null
  /** 현대 국가 요약(있으면) */
  country: OrganizationCountryRefDto | null
  /** 역사국가 요약(있으면) — 표시는 역사 우선 */
  historicalCountry: OrganizationCountryRefDto | null
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
