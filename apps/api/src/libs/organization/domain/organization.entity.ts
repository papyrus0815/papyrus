import {
  OrganizationType,
  OrganizationScope,
} from '@prisma/client'

/**
 * 조직 엔티티 (행정기구·국제기구 등)
 */
export interface OrganizationEntity {
  id: string
  name: string
  shortName: string | null
  localName: string | null
  type: OrganizationType
  scope: OrganizationScope | null
  description: string | null
  foundedDate: Date | null
  dissolvedDate: Date | null
  websiteUrl: string | null
  logoUrl: string | null
  ideology: string | null
  headquartersCityId: string | null
  countryId: string | null
  historicalCountryId: string | null
  createdAt: Date
  updatedAt: Date
}

/**
 * 조직 계층 관계 (OrganizationHierarchy)
 */
export interface OrganizationHierarchyEntity {
  id: string
  parentOrganizationId: string
  childOrganizationId: string
  relationType: string
  startDate: Date | null
  endDate: Date | null
  notes: string | null
  createdAt: Date
  updatedAt: Date
}
