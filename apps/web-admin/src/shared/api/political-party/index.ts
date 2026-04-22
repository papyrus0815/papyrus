import { getPoliticalParties as fetchParties, type PoliticalPartyRow } from '../election'

export type PoliticalPosition =
  | 'FAR_LEFT'
  | 'LEFT'
  | 'CENTER_LEFT'
  | 'CENTER'
  | 'CENTER_RIGHT'
  | 'RIGHT'
  | 'FAR_RIGHT'
  | 'BIG_TENT'

export type PoliticalParty = PoliticalPartyRow & {
  localName?: string | null
  ideology?: string | null
  position?: PoliticalPosition | null
  description?: string | null
  foundedDate?: string | null
  dissolvedDate?: string | null
  logoUrl?: string | null
  brandColor?: string | null
  createdAt?: string
  updatedAt?: string
}

export type CreatePoliticalPartyInput = {
  name: string
  shortName?: string | null
  localName?: string | null
  ideology?: string | null
  position?: PoliticalPosition | null
  description?: string | null
  foundedDate?: string | null
  dissolvedDate?: string | null
  logoUrl?: string | null
  /** UI·차트용 #RRGGBB */
  brandColor?: string | null
  countryId?: string | null
  /** 역사적 국가 맥락의 정당 (현대 국가와 배타적으로 쓰는 경우가 많음) */
  historicalCountryId?: string | null
}

export type UpdatePoliticalPartyInput = Partial<CreatePoliticalPartyInput>

export type PoliticalPartyTransitionKind =
  | 'SUCCESSION'
  | 'MERGER_INTO'
  | 'SPLIT_FROM'
  | 'CONTINUITY'

export type PartyTransitionEndpoint = {
  id: string
  fromPartyId: string
  toPartyId: string
  kind: PoliticalPartyTransitionKind
  effectiveDate?: string | null
  notes?: string | null
  toParty?: { id: string; name: string; shortName?: string | null; brandColor?: string | null }
  fromParty?: { id: string; name: string; shortName?: string | null; brandColor?: string | null }
}

export type PoliticalPartyLineageDto = {
  successors: PartyTransitionEndpoint[]
  predecessors: PartyTransitionEndpoint[]
}

/** GET /political-parties/:id/top-leaders — 국가원수·정부수반 재임 */
export type PartyTopLeaderTenure = {
  id: string
  positionType: 'HEAD_OF_STATE' | 'HEAD_OF_GOVERNMENT'
  title?: string | null
  termNumber?: number | null
  subTermNumber?: number | null
  startDate: string
  endDate?: string | null
  positionDefinition?: { id: string; title: string; positionType?: string } | null
  person: {
    id: string
    name: string
    surname?: string | null
    middleName?: string | null
    nameDisplayOrder?: string | null
    profileImageUrl?: string | null
    country?: {
      defaultNameDisplayOrder?: string | null
      isoCode?: string | null
    } | null
  }
  electionCandidacy?: {
    partyId?: string | null
    election?: { id: string; name: string; pollDate?: string | null } | null
  } | null
}

export type PoliticalPartyTransitionDto = PartyTransitionEndpoint

export type CreatePartyTransitionInput = {
  fromPartyId: string
  toPartyId: string
  kind: PoliticalPartyTransitionKind
  effectiveDate?: string | null
  notes?: string | null
}

/** PATCH — 상대 정당(from/to) 변경 없음 */
export type UpdatePartyTransitionInput = {
  kind?: PoliticalPartyTransitionKind
  effectiveDate?: string | null
  notes?: string | null
}

import { getApiConnection } from '../client'

async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  const conn = getApiConnection()
  const base = conn.host.replace(/\/$/, '')
  const url = `${base}${path.startsWith('/') ? path : `/${path}`}`
  const headers = new Headers()
  headers.set('Content-Type', 'application/json')
  if (conn.headers) {
    for (const [headerKey, headerValue] of Object.entries(conn.headers)) {
      if (headerValue != null && headerValue !== '')
        headers.set(headerKey, String(headerValue))
    }
  }
  const fetchFn = conn.fetch ?? fetch
  const res = await fetchFn(url, {
    ...init,
    headers,
    credentials: conn.options?.credentials ?? 'include',
  })
  if (!res.ok) {
    let msg = res.statusText
    try {
      const body = await res.text()
      if (body) msg = body
    } catch {
      /* ignore */
    }
    throw new Error(msg)
  }
  if (res.status === 204) return undefined as T
  return res.json() as Promise<T>
}

/** GET /political-parties/:id/election-results */
export type PartyElectionResultRow = {
  id: string
  electionId: string
  partyId: string
  votes?: string | null
  voteSharePercent?: string | null
  seatsWon?: number | null
  notes?: string | null
  election?: {
    id: string
    name: string
    shortName?: string | null
    electionType: string
    status?: string | null
    pollDate?: string | null
    convocationOrdinal?: number | null
    totalSeats?: number | null
  } | null
}

/** GET /political-parties/:id/memberships */
export type PartyMembershipListRow = {
  id: string
  personId: string
  partyId: string
  startDate?: string | null
  endDate?: string | null
  roleCategory?: string | null
  leadershipTier?: string | null
  roleTitle?: string | null
  notes?: string | null
  person?: {
    id: string
    name: string
    surname?: string | null
    middleName?: string | null
    nameDisplayOrder?: string | null
    profileImageUrl?: string | null
    country?: { defaultNameDisplayOrder?: string | null } | null
  } | null
}

/** GET /political-parties/:id/cabinet-affiliations */
export type PartyCabinetAffiliationRow = {
  id: string
  cabinetId: string
  partyId: string
  role: string
  provenance?: string | null
  notes?: string | null
  cabinet?: {
    id: string
    name?: string | null
    headTenure?: {
      startDate?: string | null
      endDate?: string | null
    } | null
  } | null
}

export const politicalPartyApi = {
  getAll: async (params?: { countryId?: string; historicalCountryId?: string }) => {
    return fetchParties(params) as Promise<PoliticalParty[]>
  },

  getByCountryId: async (countryId: string) => {
    return fetchParties({ countryId }) as Promise<PoliticalParty[]>
  },

  getById: async (id: string) => {
    return requestJson<PoliticalParty>(`/political-parties/${encodeURIComponent(id)}`)
  },

  create: async (data: CreatePoliticalPartyInput) => {
    return requestJson<PoliticalParty>('/political-parties', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  update: async (id: string, data: UpdatePoliticalPartyInput) => {
    return requestJson<PoliticalParty>(`/political-parties/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    })
  },

  delete: async (id: string) => {
    await requestJson<void>(`/political-parties/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    })
  },

  getLineage: async (partyId: string) => {
    return requestJson<PoliticalPartyLineageDto>(
      `/political-parties/${encodeURIComponent(partyId)}/lineage`,
    )
  },

  getTopLeaders: async (partyId: string) => {
    return requestJson<PartyTopLeaderTenure[]>(
      `/political-parties/${encodeURIComponent(partyId)}/top-leaders`,
    )
  },

  /** 역대 선거 성적 — 이 정당이 등장한 모든 선거 집계 */
  getElectionResults: async (partyId: string) => {
    return requestJson<PartyElectionResultRow[]>(
      `/political-parties/${encodeURIComponent(partyId)}/election-results`,
    )
  },

  /** 소속 인물 목록 */
  getMemberships: async (partyId: string) => {
    return requestJson<PartyMembershipListRow[]>(
      `/political-parties/${encodeURIComponent(partyId)}/memberships`,
    )
  },

  /** 내각 참여 (연정·단독 집권·야당) */
  getCabinetAffiliations: async (partyId: string) => {
    return requestJson<PartyCabinetAffiliationRow[]>(
      `/political-parties/${encodeURIComponent(partyId)}/cabinet-affiliations`,
    )
  },

  createTransition: async (body: CreatePartyTransitionInput) => {
    return requestJson<PoliticalPartyTransitionDto>('/political-party-transitions', {
      method: 'POST',
      body: JSON.stringify(body),
    })
  },

  updateTransition: async (id: string, body: UpdatePartyTransitionInput) => {
    return requestJson<PoliticalPartyTransitionDto>(
      `/political-party-transitions/${encodeURIComponent(id)}`,
      { method: 'PATCH', body: JSON.stringify(body) },
    )
  },

  deleteTransition: async (transitionId: string) => {
    await requestJson<void>(
      `/political-party-transitions/${encodeURIComponent(transitionId)}`,
      { method: 'DELETE' },
    )
  },
}
