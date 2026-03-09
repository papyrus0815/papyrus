/**
 * 조직(행정기구) API
 * GET /organizations, GET /organizations/tree, GET /organizations/:id, POST, PUT, DELETE, 계층 API
 */
import type { IConnection } from '@api/IConnection'

export type OrganizationType =
  | 'POLITICAL_PARTY'
  | 'INTERGOVERNMENTAL_ORG'
  | 'NGO'
  | 'TRADE_UNION'
  | 'GOVERNMENT_AGENCY'
  | 'MILITARY_ALLIANCE'
  | 'RELIGIOUS_ORG'
  | 'BUSINESS_ASSOCIATION'
  | 'EDUCATION'
  | 'MILITARY_ACADEMY'
  | 'COMPANY'
  | 'OTHER'

export type OrganizationScope =
  | 'INTERNATIONAL'
  | 'SUPRANATIONAL'
  | 'REGIONAL'
  | 'NATIONAL'
  | 'SUBNATIONAL'
  | 'LOCAL'

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

export interface OrganizationTreeNodeDto extends OrganizationResponseDto {
  children: OrganizationTreeNodeDto[]
  parentIds: string[]
}

export interface OrganizationListParams {
  countryId?: string
  historicalCountryId?: string
  type?: OrganizationType
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
  countryId?: string | null
  historicalCountryId?: string | null
}

const base = (conn: IConnection) => conn.host.replace(/\/$/, '')

export async function getOrganizations(
  conn: IConnection,
  params?: OrganizationListParams,
): Promise<OrganizationResponseDto[]> {
  const url = new URL(`${base(conn)}/organizations`)
  if (params?.countryId) url.searchParams.set('countryId', params.countryId)
  if (params?.historicalCountryId)
    url.searchParams.set('historicalCountryId', params.historicalCountryId)
  if (params?.type) url.searchParams.set('type', params.type)
  const res = await fetch(url.toString(), { headers: conn.headers ?? {}, credentials: 'include' })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export async function getOrganizationsTree(
  conn: IConnection,
  params?: OrganizationListParams,
): Promise<OrganizationTreeNodeDto[]> {
  const url = new URL(`${base(conn)}/organizations/tree`)
  if (params?.countryId) url.searchParams.set('countryId', params.countryId)
  if (params?.historicalCountryId)
    url.searchParams.set('historicalCountryId', params.historicalCountryId)
  if (params?.type) url.searchParams.set('type', params.type)
  const res = await fetch(url.toString(), { headers: conn.headers ?? {}, credentials: 'include' })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export async function getOrganizationById(
  conn: IConnection,
  id: string,
): Promise<OrganizationResponseDto> {
  const res = await fetch(`${base(conn)}/organizations/${id}`, {
    headers: conn.headers ?? {},
    credentials: 'include',
  })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export async function createOrganization(
  conn: IConnection,
  body: CreateOrganizationBody,
): Promise<OrganizationResponseDto> {
  const res = await fetch(`${base(conn)}/organizations`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(conn.headers ?? {}) },
    body: JSON.stringify(body),
    credentials: 'include',
  })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export async function updateOrganization(
  conn: IConnection,
  id: string,
  body: Partial<CreateOrganizationBody>,
): Promise<OrganizationResponseDto> {
  const res = await fetch(`${base(conn)}/organizations/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...(conn.headers ?? {}) },
    body: JSON.stringify(body),
    credentials: 'include',
  })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export async function deleteOrganization(
  conn: IConnection,
  id: string,
): Promise<void> {
  const res = await fetch(`${base(conn)}/organizations/${id}`, {
    method: 'DELETE',
    headers: conn.headers ?? {},
    credentials: 'include',
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
  const res = await fetch(`${base(conn)}/organizations/hierarchy`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(conn.headers ?? {}) },
    body: JSON.stringify(body),
    credentials: 'include',
  })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export async function removeOrganizationHierarchy(
  conn: IConnection,
  parentId: string,
  childId: string,
): Promise<void> {
  const res = await fetch(
    `${base(conn)}/organizations/hierarchy/${parentId}/${childId}`,
    { method: 'DELETE', headers: conn.headers ?? {}, credentials: 'include' },
  )
  if (!res.ok) throw new Error(await res.text())
}
