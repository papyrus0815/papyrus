/**
 * 조직(행정기구·국제기구·다자협의체·군사동맹 등) API
 * GET /organizations, GET /organizations/tree, GET /organizations/:id, POST, PUT, DELETE,
 * 회원국(country-memberships), 관련 사건(events), 계층 API
 */
import type { IConnection } from '@api/IConnection'

import { getApiConnection } from './client'

export type OrganizationType =
  | 'POLITICAL_PARTY'
  | 'INTERGOVERNMENTAL_ORG'
  | 'MULTILATERAL_FORUM'
  | 'NGO'
  | 'TRADE_UNION'
  | 'GOVERNMENT_AGENCY'
  | 'MILITARY_ALLIANCE'
  | 'RELIGIOUS_ORG'
  | 'BUSINESS_ASSOCIATION'
  | 'EDUCATION'
  | 'MILITARY_ACADEMY'
  | 'COMPANY'
  | 'PARTY_ORGAN'
  | 'MASS_ORGANIZATION'
  | 'PARAMILITARY'
  | 'MEDIA'
  | 'POLITICAL_ALLIANCE'
  | 'OTHER'

export type OrganizationScope =
  | 'INTERNATIONAL'
  | 'SUPRANATIONAL'
  | 'REGIONAL'
  | 'NATIONAL'
  | 'SUBNATIONAL'
  | 'LOCAL'

export type OrganizationCountryRole =
  | 'FOUNDER'
  | 'MEMBER'
  | 'OBSERVER'
  | 'DIALOGUE_PARTNER'
  | 'SECRETARIAT_HOST'
  | 'SUSPENDED'
  | 'EXPELLED'
  | 'OTHER'

export const ORGANIZATION_TYPE_LABEL: Record<OrganizationType, string> = {
  INTERGOVERNMENTAL_ORG: '국제기구',
  MULTILATERAL_FORUM: '다자 협의체·블록',
  MILITARY_ALLIANCE: '군사 동맹',
  GOVERNMENT_AGENCY: '정부기관·행정기구',
  POLITICAL_PARTY: '정당',
  NGO: '비정부기구(NGO)',
  TRADE_UNION: '노동조합',
  RELIGIOUS_ORG: '종교단체',
  BUSINESS_ASSOCIATION: '상공·업계단체',
  EDUCATION: '교육·학술기관',
  MILITARY_ACADEMY: '군사교육기관',
  COMPANY: '기업',
  PARTY_ORGAN: '당 기구',
  MASS_ORGANIZATION: '대중 조직',
  PARAMILITARY: '준군사조직',
  MEDIA: '언론·출판',
  POLITICAL_ALLIANCE: '정치 연합·인터내셔널',
  OTHER: '기타 조직',
}

export const ORGANIZATION_SCOPE_LABEL: Record<OrganizationScope, string> = {
  INTERNATIONAL: '국제 (전 세계)',
  SUPRANATIONAL: '초국가 블록',
  REGIONAL: '지역·권역 (아태·동남아·유럽 등)',
  NATIONAL: '국가 (국내)',
  SUBNATIONAL: '광역·기초',
  LOCAL: '도시·지역',
}

export const ORGANIZATION_COUNTRY_ROLE_LABEL: Record<OrganizationCountryRole, string> = {
  FOUNDER: '창립국',
  MEMBER: '정회원국',
  DIALOGUE_PARTNER: '대화상대국·초청 파트너',
  OBSERVER: '옵서버',
  SECRETARIAT_HOST: '사무국 소재국',
  SUSPENDED: '자격정지',
  EXPELLED: '제명·탈퇴',
  OTHER: '기타',
}

export const INTERNATIONAL_ORG_TYPES: OrganizationType[] = [
  'INTERGOVERNMENTAL_ORG',
  'MULTILATERAL_FORUM',
  'MILITARY_ALLIANCE',
]

/**
 * 기업(`COMPANY` → `/companies`), 정당(`POLITICAL_PARTY` → `/political-parties`),
 * 국가 행정부처·기관(`GOVERNMENT_AGENCY` → `/government?tab=departments`)은
 * 각각 전용 정본 도메인에서 관리하므로 기구·조직 카탈로그/등록 선택지에서 제외한다.
 */
export const NON_COMPANY_ORG_TYPES: OrganizationType[] = [
  'INTERGOVERNMENTAL_ORG',
  'MULTILATERAL_FORUM',
  'MILITARY_ALLIANCE',
  'NGO',
  'TRADE_UNION',
  'BUSINESS_ASSOCIATION',
  'RELIGIOUS_ORG',
  'EDUCATION',
  'MILITARY_ACADEMY',
  'PARTY_ORGAN',
  'MASS_ORGANIZATION',
  'PARAMILITARY',
  'MEDIA',
  'POLITICAL_ALLIANCE',
  'OTHER',
]

export const DOMESTIC_ORG_TYPES: OrganizationType[] = NON_COMPANY_ORG_TYPES.filter(
  (t) => !INTERNATIONAL_ORG_TYPES.includes(t),
)

/**
 * 유형별 시그니처 컬러 — 다크·라이트 모두에서 채도·대비가 안정적인 값.
 * 기구 목록의 유형 표지와 등록 모달의 섹션 점·요약 배지가 같은 색을 쓴다.
 */
export const ORGANIZATION_TYPE_HUE: Record<OrganizationType, string> = {
  MULTILATERAL_FORUM: '#6366f1',
  INTERGOVERNMENTAL_ORG: '#10b981',
  MILITARY_ALLIANCE: '#ec4899',
  GOVERNMENT_AGENCY: '#3b82f6',
  POLITICAL_PARTY: '#f59e0b',
  NGO: '#14b8a6',
  TRADE_UNION: '#f97316',
  BUSINESS_ASSOCIATION: '#0ea5e9',
  RELIGIOUS_ORG: '#8b5cf6',
  EDUCATION: '#06b6d4',
  MILITARY_ACADEMY: '#64748b',
  COMPANY: '#64748b',
  PARTY_ORGAN: '#b45309',
  MASS_ORGANIZATION: '#d946ef',
  PARAMILITARY: '#57534e',
  MEDIA: '#0891b2',
  POLITICAL_ALLIANCE: '#7c3aed',
  OTHER: '#94a3b8',
}

export function isInternationalOrgType(type?: OrganizationType | string | null): boolean {
  return (
    type === 'INTERGOVERNMENTAL_ORG' ||
    type === 'MULTILATERAL_FORUM' ||
    type === 'MILITARY_ALLIANCE'
  )
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
  headquartersCity?: { id: string; name: string } | null
  predecessorOrganizationId?: string | null
  predecessor?: OrganizationLineageRefDto | null
  successors?: OrganizationLineageRefDto[]
  countryId: string | null
  historicalCountryId: string | null
  country?: { id: string; name: string; flagEmoji?: string | null } | null
  historicalCountry?: { id: string; name: string } | null
  countryMemberCount?: number
  eventSeriesCount?: number
  createdAt: string
  updatedAt: string
}

export interface OrganizationMemberDto {
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

export interface OrganizationMembershipStatusPhase {
  role: OrganizationCountryRole
  startEra?: 'BC' | 'AD' | null
  startYear?: number | null
  endEra?: 'BC' | 'AD' | null
  endYear?: number | null
  notes?: string | null
}

export interface OrganizationCountryMembershipDto {
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
  statusHistory?: OrganizationMembershipStatusPhase[] | null
  country: { id: string; name: string; flagEmoji: string | null } | null
  historicalCountry: { id: string; name: string } | null
}

export interface CountryOrganizationMembershipDto
  extends OrganizationCountryMembershipDto {
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

export interface CreateOrganizationCountryMembershipBody {
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

export interface UpdateOrganizationCountryMembershipBody {
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

export interface OrganizationRelatedEventDto {
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

export interface OrganizationTreeNodeDto extends OrganizationResponseDto {
  children: OrganizationTreeNodeDto[]
  parentIds: string[]
}

export interface OrganizationListParams {
  countryId?: string
  historicalCountryId?: string
  type?: OrganizationType
  types?: OrganizationType[]
  scope?: OrganizationScope
  excludeCompanies?: boolean
  excludePoliticalParties?: boolean
  excludeGovernmentAgencies?: boolean
}

export interface CreateOrganizationMemberBody {
  personId: string
  roleTitle?: string | null
  notes?: string | null
}

export interface CreateOrganizationBody {
  name: string
  shortName?: string | null
  localName?: string | null
  type: OrganizationType
  scope?: OrganizationScope | null
  description?: string | null
  foundedDate?: string | null
  dissolvedDate?: string | null
  websiteUrl?: string | null
  logoUrl?: string | null
  ideology?: string | null
  headquartersCityId?: string | null
  predecessorOrganizationId?: string | null
  countryId?: string | null
  historicalCountryId?: string | null
  members?: CreateOrganizationMemberBody[]
  countryMemberships?: CreateOrganizationCountryMembershipBody[]
}

/**
 * 특정 사건 시점(부호 연도)에 해당하는 회원국 지위(role)를 판정한다.
 * 다단계 지위 이력(statusHistory: 예 '1992~1995 옵서버 → 1995~ 정회원', '2011~2023 자격정지')이 있으면
 * 해당 연도에 걸치는 구간 지위를 우선 반환하고, 비가입·자격정지·제명이면 null을 반환한다.
 */
export function resolveOrganizationMembershipRoleAtYear(
  membership: Pick<
    OrganizationCountryMembershipDto,
    'role' | 'startEra' | 'startYear' | 'endEra' | 'endYear' | 'statusHistory'
  >,
  targetSignedYear?: number | null,
): OrganizationCountryRole | null {
  const toSigned = (era?: 'BC' | 'AD' | null, yr?: number | null) =>
    yr != null ? (era === 'BC' ? -yr : yr) : null

  if (
    targetSignedYear != null &&
    Number.isFinite(targetSignedYear) &&
    Array.isArray(membership.statusHistory) &&
    membership.statusHistory.length > 0
  ) {
    const matchedPhase = membership.statusHistory.find((phase) => {
      const ps = toSigned(phase.startEra, phase.startYear)
      const pe = toSigned(phase.endEra, phase.endYear)
      if (ps != null && targetSignedYear < ps) return false
      if (pe != null && targetSignedYear > pe) return false
      return true
    })
    if (matchedPhase) {
      if (
        matchedPhase.role === 'EXPELLED' ||
        matchedPhase.role === 'SUSPENDED'
      ) {
        return null
      }
      return matchedPhase.role
    }
  }

  if (membership.role === 'EXPELLED' || membership.role === 'SUSPENDED') {
    return null
  }
  if (targetSignedYear == null || !Number.isFinite(targetSignedYear)) {
    return membership.endYear == null ? membership.role : null
  }
  const signedStart = toSigned(membership.startEra, membership.startYear)
  const signedEnd = toSigned(membership.endEra, membership.endYear)
  if (signedStart != null && targetSignedYear < signedStart) return null
  if (signedEnd != null && targetSignedYear > signedEnd) return null
  return membership.role
}

/**
 * 특정 사건 시점(부호 연도)에 이 회원국 멤버십이 유효했는지 판정한다.
 * 제명(EXPELLED)·자격정지(SUSPENDED)이거나 시점 이후 가입·시점 이전 탈퇴한 국가는 제외한다.
 */
export function isOrganizationMembershipActiveAtYear(
  membership: Pick<
    OrganizationCountryMembershipDto,
    'role' | 'startEra' | 'startYear' | 'endEra' | 'endYear' | 'statusHistory'
  >,
  targetSignedYear?: number | null,
): boolean {
  return resolveOrganizationMembershipRoleAtYear(membership, targetSignedYear) !== null
}

const base = (conn: IConnection) => conn.host.replace(/\/$/, '')

/**
 * OrganizationController 전 엔드포인트는 JWT 인증(@UseGuards(AuthGuard('jwt')))이 필요하다.
 * 호출 측이 정적 apiConnection을 넘기더라도 최신 JWT 헤더와 401 자동 리프레시 래퍼(conn.fetch)를
 * 보장하도록 getApiConnection()과 병합한다.
 */
function orgFetch(
  conn: IConnection,
  url: string,
  init: RequestInit = {},
): Promise<Response> {
  const authConn = getApiConnection()
  const fetcher = conn.fetch ?? authConn.fetch ?? fetch
  const mergedHeaders: Record<string, string> = {
    ...((authConn.headers ?? {}) as Record<string, string>),
    ...((conn.headers ?? {}) as Record<string, string>),
    ...((init.headers ?? {}) as Record<string, string>),
  }
  return fetcher(url, {
    ...init,
    headers: mergedHeaders,
    credentials: 'include',
  })
}

export async function getOrganizations(
  conn: IConnection,
  params?: OrganizationListParams,
): Promise<OrganizationResponseDto[]> {
  const url = new URL(`${base(conn)}/organizations`)
  if (params?.countryId) url.searchParams.set('countryId', params.countryId)
  if (params?.historicalCountryId)
    url.searchParams.set('historicalCountryId', params.historicalCountryId)
  if (params?.types && params.types.length > 0) {
    url.searchParams.set('types', params.types.join(','))
  } else if (params?.type) {
    url.searchParams.set('type', params.type)
  }
  if (params?.excludeCompanies) {
    url.searchParams.set('excludeCompanies', 'true')
    url.searchParams.set('excludePoliticalParties', 'true')
    url.searchParams.set('excludeGovernmentAgencies', 'true')
  } else {
    if (params?.excludePoliticalParties) {
      url.searchParams.set('excludePoliticalParties', 'true')
    }
    if (params?.excludeGovernmentAgencies) {
      url.searchParams.set('excludeGovernmentAgencies', 'true')
    }
  }
  if (params?.scope) url.searchParams.set('scope', params.scope)
  const res = await orgFetch(conn, url.toString())
  if (!res.ok) throw new Error(await res.text())
  const data: OrganizationResponseDto[] = await res.json()
  return params?.excludeCompanies
    ? data.filter(
        (item) =>
          item.type !== 'COMPANY' &&
          item.type !== 'POLITICAL_PARTY' &&
          item.type !== 'GOVERNMENT_AGENCY',
      )
    : data
}

export async function getOrganizationsTree(
  conn: IConnection,
  params?: OrganizationListParams,
): Promise<OrganizationTreeNodeDto[]> {
  const url = new URL(`${base(conn)}/organizations/tree`)
  if (params?.countryId) url.searchParams.set('countryId', params.countryId)
  if (params?.historicalCountryId)
    url.searchParams.set('historicalCountryId', params.historicalCountryId)
  if (params?.types && params.types.length > 0) {
    url.searchParams.set('types', params.types.join(','))
  } else if (params?.type) {
    url.searchParams.set('type', params.type)
  }
  if (params?.excludeCompanies) {
    url.searchParams.set('excludeCompanies', 'true')
    url.searchParams.set('excludePoliticalParties', 'true')
    url.searchParams.set('excludeGovernmentAgencies', 'true')
  } else {
    if (params?.excludePoliticalParties) {
      url.searchParams.set('excludePoliticalParties', 'true')
    }
    if (params?.excludeGovernmentAgencies) {
      url.searchParams.set('excludeGovernmentAgencies', 'true')
    }
  }
  if (params?.scope) url.searchParams.set('scope', params.scope)
  const res = await orgFetch(conn, url.toString())
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export async function getOrganizationById(
  conn: IConnection,
  id: string,
): Promise<OrganizationResponseDto> {
  const res = await orgFetch(conn, `${base(conn)}/organizations/${id}`)
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export async function getOrganizationMembers(
  conn: IConnection,
  id: string,
): Promise<OrganizationMemberDto[]> {
  const res = await orgFetch(conn, `${base(conn)}/organizations/${id}/members`)
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export async function addOrganizationMember(
  conn: IConnection,
  organizationId: string,
  body: CreateOrganizationMemberBody,
): Promise<OrganizationMemberDto> {
  const res = await orgFetch(
    conn,
    `${base(conn)}/organizations/${organizationId}/members`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    },
  )
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export async function removeOrganizationMember(
  conn: IConnection,
  organizationId: string,
  personId: string,
): Promise<void> {
  const res = await orgFetch(
    conn,
    `${base(conn)}/organizations/${organizationId}/members/${personId}`,
    { method: 'DELETE' },
  )
  if (!res.ok) throw new Error(await res.text())
}

export async function getOrganizationCountryMemberships(
  conn: IConnection,
  organizationId: string,
): Promise<OrganizationCountryMembershipDto[]> {
  const res = await orgFetch(
    conn,
    `${base(conn)}/organizations/${encodeURIComponent(organizationId)}/country-memberships`,
  )
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export async function getCountryOrganizationMemberships(
  conn: IConnection,
  params: { countryId?: string; historicalCountryId?: string },
): Promise<CountryOrganizationMembershipDto[]> {
  const url = new URL(`${base(conn)}/organizations/country-memberships`)
  if (params.countryId) url.searchParams.set('countryId', params.countryId)
  if (params.historicalCountryId) {
    url.searchParams.set('historicalCountryId', params.historicalCountryId)
  }
  const res = await orgFetch(conn, url.toString())
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export async function addOrganizationCountryMembership(
  conn: IConnection,
  organizationId: string,
  body: CreateOrganizationCountryMembershipBody,
): Promise<OrganizationCountryMembershipDto> {
  const res = await orgFetch(
    conn,
    `${base(conn)}/organizations/${encodeURIComponent(organizationId)}/country-memberships`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    },
  )
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export async function updateOrganizationCountryMembership(
  conn: IConnection,
  organizationId: string,
  membershipId: string,
  body: UpdateOrganizationCountryMembershipBody,
): Promise<OrganizationCountryMembershipDto> {
  const res = await orgFetch(
    conn,
    `${base(conn)}/organizations/${encodeURIComponent(organizationId)}/country-memberships/${encodeURIComponent(membershipId)}`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    },
  )
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export async function removeOrganizationCountryMembership(
  conn: IConnection,
  organizationId: string,
  membershipId: string,
): Promise<void> {
  const res = await orgFetch(
    conn,
    `${base(conn)}/organizations/${encodeURIComponent(organizationId)}/country-memberships/${encodeURIComponent(membershipId)}`,
    { method: 'DELETE' },
  )
  if (!res.ok) throw new Error(await res.text())
}

export async function getOrganizationRelatedEvents(
  conn: IConnection,
  organizationId: string,
): Promise<OrganizationRelatedEventDto[]> {
  const res = await orgFetch(
    conn,
    `${base(conn)}/organizations/${encodeURIComponent(organizationId)}/events`,
  )
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export async function createOrganization(
  conn: IConnection,
  body: CreateOrganizationBody,
): Promise<OrganizationResponseDto> {
  const res = await orgFetch(conn, `${base(conn)}/organizations`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export async function updateOrganization(
  conn: IConnection,
  id: string,
  body: Partial<CreateOrganizationBody>,
): Promise<OrganizationResponseDto> {
  const res = await orgFetch(conn, `${base(conn)}/organizations/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export async function deleteOrganization(
  conn: IConnection,
  id: string,
): Promise<void> {
  const res = await orgFetch(conn, `${base(conn)}/organizations/${id}`, {
    method: 'DELETE',
  })
  if (!res.ok) throw new Error(await res.text())
}

export type OrganizationRelationType =
  | 'SUBSIDIARY'
  | 'SPECIALIZED_AGENCY'
  | 'AFFILIATED'
  | 'COMMITTEE'
  | 'OBSERVER'
  | 'OTHER'

export interface CreateOrganizationHierarchyBody {
  parentOrganizationId: string
  childOrganizationId: string
  relationType: OrganizationRelationType
  startDate?: string | null
  endDate?: string | null
  notes?: string | null
}

export async function addOrganizationHierarchy(
  conn: IConnection,
  body: CreateOrganizationHierarchyBody,
): Promise<{ id: string }> {
  const res = await orgFetch(conn, `${base(conn)}/organizations/hierarchy`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export async function removeOrganizationHierarchy(
  conn: IConnection,
  parentId: string,
  childId: string,
): Promise<void> {
  const res = await orgFetch(
    conn,
    `${base(conn)}/organizations/hierarchy/${parentId}/${childId}`,
    { method: 'DELETE' },
  )
  if (!res.ok) throw new Error(await res.text())
}
