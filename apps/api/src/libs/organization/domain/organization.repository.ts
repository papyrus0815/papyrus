import {
  OrganizationType,
  OrganizationScope,
  OrganizationRelationType,
  OrganizationCountryRole,
} from '@prisma/client'

/**
 * 조직 목록 조회 필터
 */
export interface OrganizationListFilter {
  countryId?: string
  historicalCountryId?: string
  type?: OrganizationType
  types?: OrganizationType[]
  scope?: OrganizationScope
  excludeCompanies?: boolean
  excludePoliticalParties?: boolean
  excludeGovernmentAgencies?: boolean
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
  predecessorOrganizationId?: string | null
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
  predecessorOrganizationId?: string | null
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
 * 연결 국가/역사국가 요약 (응답 표시용 — 프론트가 id→이름 전체목록 lookup 없이 표시)
 */
export interface OrganizationCountrySummary {
  id: string
  name: string
  flagEmoji?: string | null
}

export interface OrganizationLineageSummary {
  id: string
  name: string
  shortName: string | null
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
  headquartersCity: { id: string; name: string } | null
  predecessorOrganizationId: string | null
  predecessor: OrganizationLineageSummary | null
  successors: OrganizationLineageSummary[]
  countryId: string | null
  historicalCountryId: string | null
  /** 현대 국가 요약(있으면). 그룹핑 축 */
  country: OrganizationCountrySummary | null
  /** 역사국가 요약(있으면). 소속 축 — 표시는 역사 우선 */
  historicalCountry: OrganizationCountrySummary | null
  /** 가입 회원국·파트너국 수 */
  countryMemberCount: number
  /** 주관 정기 회의·행사 시리즈 수 */
  eventSeriesCount: number
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

/**
 * 조직 소속 인물(관직 재임 GovernmentPositionTenure 또는 조직 역할 OrganizationPersonRole)
 */
export interface OrganizationMemberEntity {
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

export interface AddOrganizationMemberData {
  personId: string
  roleTitle?: string | null
  notes?: string | null
}

export interface OrganizationMembershipStatusPhase {
  role: OrganizationCountryRole
  startEra?: 'BC' | 'AD' | null
  startYear?: number | null
  endEra?: 'BC' | 'AD' | null
  endYear?: number | null
  notes?: string | null
}

/**
 * 조직 ↔ 국가(현대/역사) 멤버십 엔티티 (회원국·창립국·옵서버·대화상대국 등)
 */
export interface OrganizationCountryMembershipEntity {
  id: string
  organizationId: string
  countryId: string | null
  historicalCountryId: string | null
  role: OrganizationCountryRole
  startEra: 'BC' | 'AD' | null
  startYear: number | null
  startMonth: number | null
  startDay: number | null
  startDate: Date | null
  endEra: 'BC' | 'AD' | null
  endYear: number | null
  endMonth: number | null
  endDay: number | null
  endDate: Date | null
  sortOrder: number
  notes: string | null
  statusHistory: OrganizationMembershipStatusPhase[] | null
  country: { id: string; name: string; flagEmoji: string | null } | null
  historicalCountry: { id: string; name: string } | null
}

export interface CountryOrganizationMembershipEntity
  extends OrganizationCountryMembershipEntity {
  organization: {
    id: string
    name: string
    shortName: string | null
    type: OrganizationType
    scope: OrganizationScope | null
    logoUrl: string | null
    foundedDate: Date | null
    dissolvedDate: Date | null
    countryMemberCount: number
    eventSeriesCount: number
  }
}

export interface UpsertOrganizationCountryMembershipData {
  countryId?: string | null
  historicalCountryId?: string | null
  role?: OrganizationCountryRole
  startEra?: 'BC' | 'AD' | null
  startYear?: number | null
  startMonth?: number | null
  startDay?: number | null
  endEra?: 'BC' | 'AD' | null
  endYear?: number | null
  endMonth?: number | null
  endDay?: number | null
  sortOrder?: number
  notes?: string | null
  statusHistory?: OrganizationMembershipStatusPhase[] | null
}

export interface UpdateOrganizationCountryMembershipData {
  role?: OrganizationCountryRole
  startEra?: 'BC' | 'AD' | null
  startYear?: number | null
  startMonth?: number | null
  startDay?: number | null
  endEra?: 'BC' | 'AD' | null
  endYear?: number | null
  endMonth?: number | null
  endDay?: number | null
  sortOrder?: number
  notes?: string | null
  statusHistory?: OrganizationMembershipStatusPhase[] | null
}

export interface OrganizationRelatedEventEntity {
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
  findMembers(organizationId: string): Promise<OrganizationMemberEntity[]>
  addMemberRole(
    organizationId: string,
    data: AddOrganizationMemberData,
  ): Promise<OrganizationMemberEntity>
  removeMemberRole(organizationId: string, personId: string): Promise<void>

  findCountryMemberships(
    organizationId: string,
  ): Promise<OrganizationCountryMembershipEntity[]>
  findMembershipsByCountry(params: {
    countryId?: string
    historicalCountryId?: string
  }): Promise<CountryOrganizationMembershipEntity[]>
  upsertCountryMembership(
    organizationId: string,
    data: UpsertOrganizationCountryMembershipData,
  ): Promise<OrganizationCountryMembershipEntity>
  updateCountryMembership(
    organizationId: string,
    membershipId: string,
    data: UpdateOrganizationCountryMembershipData,
  ): Promise<OrganizationCountryMembershipEntity>
  removeCountryMembership(
    organizationId: string,
    membershipId: string,
  ): Promise<void>
  findRelatedEvents(
    organizationId: string,
    userId?: string,
  ): Promise<OrganizationRelatedEventEntity[]>
}
