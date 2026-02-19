import type { OrganizationType, OrganizationScope } from '@prisma/client'

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
