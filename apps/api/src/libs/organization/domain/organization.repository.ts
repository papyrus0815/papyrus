import {
  OrganizationType,
  OrganizationScope,
  OrganizationRelationType,
} from '@prisma/client'

/**
 * 조직 목록 조회 필터
 */
export interface OrganizationListFilter {
  countryId?: string
  historicalCountryId?: string
  type?: OrganizationType
}

/**
 * 조직 생성 데이터
 */
export interface CreateOrganizationData {
  name: string
  shortName?: string | null
  localName?: string | null
  type: OrganizationType
  scope?: OrganizationScope | null
  description?: string | null
  foundedDate?: Date | null
  dissolvedDate?: Date | null
  websiteUrl?: string | null
  logoUrl?: string | null
  ideology?: string | null
  headquartersCityId?: string | null
  countryId?: string | null
  historicalCountryId?: string | null
}

/**
 * 조직 수정 데이터
 */
export interface UpdateOrganizationData {
  name?: string
  shortName?: string | null
  localName?: string | null
  type?: OrganizationType
  scope?: OrganizationScope | null
  description?: string | null
  foundedDate?: Date | null
  dissolvedDate?: Date | null
  websiteUrl?: string | null
  logoUrl?: string | null
  ideology?: string | null
  headquartersCityId?: string | null
  countryId?: string | null
  historicalCountryId?: string | null
}

/**
 * 조직 계층(상하 관계) 생성 데이터
 */
export interface CreateOrganizationHierarchyData {
  parentOrganizationId: string
  childOrganizationId: string
  relationType: OrganizationRelationType
  startDate?: Date | null
  endDate?: Date | null
  notes?: string | null
}

/**
 * 조직 엔티티 (Repository/Service 계층)
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
 * 조직 계층 엔티티
 */
export interface OrganizationHierarchyEntity {
  id: string
  parentOrganizationId: string
  childOrganizationId: string
  relationType: OrganizationRelationType
  startDate: Date | null
  endDate: Date | null
  notes: string | null
}

/**
 * 조직 트리 노드 (계층 조회용)
 */
export interface OrganizationTreeNode extends OrganizationEntity {
  children: OrganizationTreeNode[]
  parentIds: string[]
}

export interface IOrganizationRepository {
  findById(id: string): Promise<OrganizationEntity | null>
  findMany(filter: OrganizationListFilter): Promise<OrganizationEntity[]>
  create(data: CreateOrganizationData): Promise<OrganizationEntity>
  update(id: string, data: UpdateOrganizationData): Promise<OrganizationEntity>
  delete(id: string): Promise<void>

  addHierarchy(data: CreateOrganizationHierarchyData): Promise<OrganizationHierarchyEntity>
  removeHierarchy(parentId: string, childId: string): Promise<void>
  findChildren(organizationId: string): Promise<OrganizationHierarchyEntity[]>
  findParents(organizationId: string): Promise<OrganizationHierarchyEntity[]>
  findTree(filter: OrganizationListFilter): Promise<OrganizationTreeNode[]>
}
