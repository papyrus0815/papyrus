/**
 * 선거·정당·선거구·행정부-정당 연계 API
 */
import { getApiConnection } from './client'

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

// --- Political party (already in political-party; re-export helpers here) ---
export async function getPoliticalParties(params?: {
  countryId?: string
  historicalCountryId?: string
}) {
  const queryParams = new URLSearchParams()
  if (params?.countryId) queryParams.set('countryId', params.countryId)
  if (params?.historicalCountryId)
    queryParams.set('historicalCountryId', params.historicalCountryId)
  const qs = queryParams.toString()
  return requestJson<PoliticalPartyRow[]>(
    `/political-parties${qs ? `?${qs}` : ''}`,
  )
}

export type PoliticalPartyRow = {
  id: string
  name: string
  shortName?: string | null
  logoUrl?: string | null
  brandColor?: string | null
  countryId?: string | null
  historicalCountryId?: string | null
}

// --- Party membership ---
/** DB `PartyMembershipRoleCategory` — 국가 공통 역할 분류 */
export type PartyMembershipRoleCategory =
  | 'GENERAL_MEMBER'
  | 'LEADERSHIP'
  | 'PARLIAMENTARY'
  | 'LOCAL_ORGANIZATION'
  | 'WING_ORGAN'
  | 'POLICY_STAFF'
  | 'HONORARY'
  | 'OTHER'

/** 지도부(LEADERSHIP)일 때 상대적 위계 */
export type PartyMembershipLeadershipTier =
  | 'TOP'
  | 'SECOND'
  | 'SENIOR'
  | 'ORDINARY'
  | 'JUNIOR'
  | 'UNSPECIFIED'

export type PartyMembershipRow = {
  id: string
  personId: string
  /** 인물 상세 API는 과거에 누락될 수 있음 — `party.id`로 대체 */
  partyId?: string
  /** 일부 응답에서 ISO 문자열 대신 Date로 올 수 있음 */
  startDate?: string | Date | null
  endDate?: string | Date | null
  roleCategory?: PartyMembershipRoleCategory | null
  leadershipTier?: PartyMembershipLeadershipTier | null
  roleTitle?: string | null
  notes?: string | null
  party?: { id: string; name: string; shortName?: string | null }
}

export async function getPartyMemberships(personId: string) {
  return requestJson<PartyMembershipRow[]>(
    `/persons/${encodeURIComponent(personId)}/political-party-memberships`,
  )
}

export async function createPartyMembership(
  personId: string,
  body: {
    partyId: string
    startDate?: string | null
    endDate?: string | null
    roleCategory?: PartyMembershipRoleCategory | null
    leadershipTier?: PartyMembershipLeadershipTier | null
    roleTitle?: string | null
    notes?: string | null
  },
) {
  return requestJson<PartyMembershipRow>(
    `/persons/${encodeURIComponent(personId)}/political-party-memberships`,
    { method: 'POST', body: JSON.stringify(body) },
  )
}

export async function updatePartyMembership(
  personId: string,
  membershipId: string,
  body: Partial<{
    partyId: string
    startDate: string | null
    endDate: string | null
    roleCategory: PartyMembershipRoleCategory | null
    leadershipTier: PartyMembershipLeadershipTier | null
    roleTitle: string | null
    notes: string | null
  }>,
) {
  return requestJson<PartyMembershipRow>(
    `/persons/${encodeURIComponent(personId)}/political-party-memberships/${encodeURIComponent(membershipId)}`,
    { method: 'PATCH', body: JSON.stringify(body) },
  )
}

export async function deletePartyMembership(
  personId: string,
  membershipId: string,
) {
  return requestJson<void>(
    `/persons/${encodeURIComponent(personId)}/political-party-memberships/${encodeURIComponent(membershipId)}`,
    { method: 'DELETE' },
  )
}

// --- Elections (list for admin; person detail uses candidacies from detail) ---
export type ElectionListRow = {
  id: string
  name: string
  shortName?: string | null
  electionType: string
  status?: string
  pollDate: string
  /** 기간 투표·개표 종료(선택) */
  pollEndDate?: string | null
  /** 법정·예정 임기 만료(선택) */
  legislatureTermEnd?: string | null
  /** 회차(대수) */
  convocationOrdinal?: number | null
  candidacies?: { id: string }[]
  ballotOptions?: { id: string }[]
  countryId?: string | null
}

/**
 * 행정부–정당 연결(선거 집계) 목록용 — 국민투표·다중 안건(`REFERENDUM_OR_PLEBISCITE`) 제외
 */
export const CABINET_PARTY_LINK_ELECTION_TYPES = [
  'PRESIDENTIAL_OR_HEAD',
  'PARLIAMENTARY_CONSTITUENCY',
  'PARLIAMENTARY_PROPORTIONAL',
  'LOCAL',
  'BY_ELECTION',
  'PRIMARY',
  'OTHER',
] as const

export async function getElections(params?: {
  countryId?: string
  historicalCountryId?: string
  /** 정당 집계가 1건 이상 있는 선거만 */
  hasPartyResults?: boolean
  /** `CABINET_PARTY_LINK_ELECTION_TYPES` 등 — 콤마 구분은 클라이언트에서 join */
  electionTypes?: readonly string[]
}) {
  const queryParams = new URLSearchParams()
  if (params?.countryId) queryParams.set('countryId', params.countryId)
  if (params?.historicalCountryId)
    queryParams.set('historicalCountryId', params.historicalCountryId)
  if (params?.hasPartyResults) queryParams.set('hasPartyResults', 'true')
  if (params?.electionTypes?.length)
    queryParams.set('electionTypes', params.electionTypes.join(','))
  const qs = queryParams.toString()
  return requestJson<ElectionListRow[]>(`/elections${qs ? `?${qs}` : ''}`)
}

export type ElectionResultDto = {
  id: string
  candidacyId: string
  votes?: string | null
  voteSharePercent?: string | null
  resultRank?: number | null
  elected?: boolean
  seatsWon?: number | null
  notes?: string | null
}

export type ElectionCandidacyDto = {
  id: string
  electionId: string
  personId?: string | null
  partyId?: string | null
  electoralDistrictId?: string | null
  nominationType: string
  ballotOrder?: number | null
  listRank?: number | null
  withdrawnDate?: string | null
  notes?: string | null
  person?: { id: string; name: string; surname?: string | null } | null
  party?: { id: string; name: string; shortName?: string | null } | null
  electoralDistrict?: { id: string; name: string; code?: string | null } | null
  result?: ElectionResultDto | null
}

export type ElectionBallotOptionDto = {
  id: string
  electionId: string
  label: string
  shortLabel?: string | null
  sortOrder: number
  notes?: string | null
  result?: {
    id?: string
    votes?: string | null
    voteSharePercent?: string | null
    notes?: string | null
  } | null
}

export type ElectionPartyResultDto = {
  id: string
  electionId: string
  partyId: string
  votes?: string | null
  voteSharePercent?: string | null
  seatsWon?: number | null
  notes?: string | null
  party?: {
    id: string
    name: string
    shortName?: string | null
    brandColor?: string | null
  }
}

/** DB `LegislatureTermClosureKind` */
export type LegislatureTermClosureKind =
  | 'FULL_TERM'
  | 'EARLY_DISSOLUTION'
  | 'NO_CONFIDENCE'
  | 'HEAD_DISSOLUTION_DECREE'
  | 'REFERENDUM_OR_PLEBISCITE'
  | 'JUDICIAL_OR_CONSTITUTIONAL'
  | 'OTHER'

export type LawTypeRow = {
  id: string
  name: string
  description?: string | null
}

export type LawRow = {
  id: string
  name: string
  summary?: string | null
  /** 제N조 — 입력·저장은 양의 정수만 */
  articleNumber?: number | null
  /** 제M항 */
  paragraphNumber?: number | null
  lawTypeId?: string | null
  countryId?: string | null
  historicalCountryId?: string | null
  lawType?: LawTypeRow | null
}

export async function getLawTypes() {
  return requestJson<LawTypeRow[]>(`/law-types`)
}

export async function createLawType(body: {
  name: string
  description?: string | null
}) {
  return requestJson<LawTypeRow>(`/law-types`, {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

export type PartyResultComparisonRowDto = {
  partyId: string
  party?: {
    id: string
    name: string
    shortName?: string | null
    brandColor?: string | null
  } | null
  previousVoteSharePercent?: string | null
  currentVoteSharePercent?: string | null
  /** 직전 대비 득표율 변화(퍼센트포인트) */
  voteShareDeltaPpt: number | null
  previousSeatsWon: number | null
  currentSeatsWon: number | null
  seatsDelta: number | null
}

export type PartyResultComparisonVsPreviousDto = {
  previousElection: {
    id: string
    name: string
    shortName?: string | null
    pollDate: string
    convocationOrdinal?: number | null
  }
  rows: PartyResultComparisonRowDto[]
}

export type ElectionDetailDto = {
  id: string
  name: string
  shortName?: string | null
  electionType: string
  status: string
  pollDate: string
  pollEndDate?: string | null
  /** 이번 선거로 구성된 의회 임기 시작 */
  legislatureTermStart?: string | null
  /** 의회 임기 종료 */
  legislatureTermEnd?: string | null
  /** 유권자 대비 실제 투표 참여율 (%) */
  voterTurnoutPercent?: string | null
  /** 선거로 선출되는 의회 총 의석 */
  totalSeats?: number | null
  countryId?: string | null
  historicalCountryId?: string | null
  scopeAdministrativeDivisionId?: string | null
  convocationOrdinal?: number | null
  resultingLegislatureClosureKind?: LegislatureTermClosureKind | null
  resultingLegislatureClosureDate?: string | null
  resultingLegislatureDissolutionNotes?: string | null
  description?: string | null
  candidacies: ElectionCandidacyDto[]
  ballotOptions: ElectionBallotOptionDto[]
  /** 선거별 정당 집계(전국 득표·의석) */
  partyResults?: ElectionPartyResultDto[]
  /** 동일 유형·범위의 직전 선거 대비 정당 득표·의석 증감 */
  partyResultComparisonVsPrevious?: PartyResultComparisonVsPreviousDto | null
}

export async function getElection(electionId: string) {
  return requestJson<ElectionDetailDto>(
    `/elections/${encodeURIComponent(electionId)}`,
  )
}

export async function getLaws(params?: {
  countryId?: string
  historicalCountryId?: string
}) {
  const queryParams = new URLSearchParams()
  if (params?.countryId) queryParams.set('countryId', params.countryId)
  if (params?.historicalCountryId)
    queryParams.set('historicalCountryId', params.historicalCountryId)
  const qs = queryParams.toString()
  return requestJson<LawRow[]>(`/laws${qs ? `?${qs}` : ''}`)
}

export async function createLaw(body: {
  name: string
  summary?: string | null
  articleNumber?: number | null
  paragraphNumber?: number | null
  lawTypeId?: string | null
  countryId?: string | null
  historicalCountryId?: string | null
}) {
  return requestJson<LawRow>(`/laws`, {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

export async function updateLaw(
  lawId: string,
  body: Partial<{
    name: string
    summary: string | null
    articleNumber: number | null
    paragraphNumber: number | null
    lawTypeId: string | null
  }>,
) {
  return requestJson<LawRow>(`/laws/${encodeURIComponent(lawId)}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  })
}

export async function deleteLaw(lawId: string) {
  return requestJson<void>(`/laws/${encodeURIComponent(lawId)}`, {
    method: 'DELETE',
  })
}

export type PartyLawLinkDto = {
  id: string
  partyId: string
  lawId: string
  relevanceNote?: string | null
  sortOrder: number
  law?: LawRow
}

export async function getPartyLaws(partyId: string) {
  return requestJson<PartyLawLinkDto[]>(
    `/political-parties/${encodeURIComponent(partyId)}/laws`,
  )
}

export async function addPartyLaw(
  partyId: string,
  body: {
    lawId: string
    relevanceNote?: string | null
    sortOrder?: number
  },
) {
  return requestJson<PartyLawLinkDto>(
    `/political-parties/${encodeURIComponent(partyId)}/laws`,
    { method: 'POST', body: JSON.stringify(body) },
  )
}

export async function removePartyLaw(partyId: string, linkId: string) {
  return requestJson<void>(
    `/political-parties/${encodeURIComponent(partyId)}/laws/${encodeURIComponent(linkId)}`,
    { method: 'DELETE' },
  )
}

export async function createElection(body: {
  name: string
  shortName?: string | null
  electionType: string
  status?: string
  pollDate: string
  pollEndDate?: string | null
  legislatureTermStart?: string | null
  legislatureTermEnd?: string | null
  voterTurnoutPercent?: string | number | null
  totalSeats?: number | null
  countryId?: string | null
  historicalCountryId?: string | null
  scopeAdministrativeDivisionId?: string | null
  convocationOrdinal?: number | null
  resultingLegislatureClosureKind?: LegislatureTermClosureKind | null
  resultingLegislatureClosureDate?: string | null
  resultingLegislatureDissolutionNotes?: string | null
  description?: string | null
}) {
  return requestJson<ElectionDetailDto>(`/elections`, {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

export async function updateElection(
  electionId: string,
  body: Partial<{
    name: string
    shortName: string | null
    electionType: string
    status: string
    pollDate: string
    pollEndDate: string | null
    legislatureTermStart: string | null
    legislatureTermEnd: string | null
    voterTurnoutPercent: string | number | null
    totalSeats: number | null
    countryId: string | null
    historicalCountryId: string | null
    scopeAdministrativeDivisionId: string | null
    convocationOrdinal: number | null
    resultingLegislatureClosureKind: LegislatureTermClosureKind | null
    resultingLegislatureClosureDate: string | null
    resultingLegislatureDissolutionNotes: string | null
    description: string | null
  }>,
) {
  return requestJson<ElectionDetailDto>(
    `/elections/${encodeURIComponent(electionId)}`,
    { method: 'PATCH', body: JSON.stringify(body) },
  )
}

export async function deleteElection(electionId: string) {
  return requestJson<void>(`/elections/${encodeURIComponent(electionId)}`, {
    method: 'DELETE',
  })
}

export async function createElectionCandidacy(
  electionId: string,
  body: {
    personId?: string | null
    partyId?: string | null
    electoralDistrictId?: string | null
    nominationType: string
    ballotOrder?: number | null
    listRank?: number | null
    withdrawnDate?: string | null
    notes?: string | null
  },
) {
  return requestJson<ElectionCandidacyDto>(
    `/elections/${encodeURIComponent(electionId)}/candidacies`,
    { method: 'POST', body: JSON.stringify(body) },
  )
}

export async function updateElectionCandidacy(
  electionId: string,
  candidacyId: string,
  body: Partial<{
    personId: string | null
    partyId: string | null
    electoralDistrictId: string | null
    nominationType: string
    ballotOrder: number | null
    listRank: number | null
    withdrawnDate: string | null
    notes: string | null
  }>,
) {
  return requestJson<ElectionCandidacyDto>(
    `/elections/${encodeURIComponent(electionId)}/candidacies/${encodeURIComponent(candidacyId)}`,
    { method: 'PATCH', body: JSON.stringify(body) },
  )
}

export async function deleteElectionCandidacy(
  electionId: string,
  candidacyId: string,
) {
  return requestJson<void>(
    `/elections/${encodeURIComponent(electionId)}/candidacies/${encodeURIComponent(candidacyId)}`,
    { method: 'DELETE' },
  )
}

export async function upsertCandidacyResult(
  electionId: string,
  candidacyId: string,
  body: {
    votes?: string | null
    voteSharePercent?: string | null
    resultRank?: number | null
    elected?: boolean
    seatsWon?: number | null
    notes?: string | null
  },
) {
  return requestJson<ElectionResultDto>(
    `/elections/${encodeURIComponent(electionId)}/candidacies/${encodeURIComponent(candidacyId)}/result`,
    { method: 'PUT', body: JSON.stringify(body) },
  )
}

// --- Electoral districts ---
export type ElectoralDistrictRow = {
  id: string
  name: string
  code?: string | null
  countryId?: string | null
  historicalCountryId?: string | null
}

export async function getElectoralDistricts(params?: {
  countryId?: string
  historicalCountryId?: string
}) {
  const queryParams = new URLSearchParams()
  if (params?.countryId) queryParams.set('countryId', params.countryId)
  if (params?.historicalCountryId)
    queryParams.set('historicalCountryId', params.historicalCountryId)
  const qs = queryParams.toString()
  return requestJson<ElectoralDistrictRow[]>(
    `/electoral-districts${qs ? `?${qs}` : ''}`,
  )
}

// --- Ballot options (국민투표 등) ---
export async function createBallotOption(
  electionId: string,
  body: {
    label: string
    shortLabel?: string | null
    sortOrder?: number
    notes?: string | null
  },
) {
  return requestJson<ElectionBallotOptionDto>(
    `/elections/${encodeURIComponent(electionId)}/ballot-options`,
    { method: 'POST', body: JSON.stringify(body) },
  )
}

export async function updateBallotOption(
  electionId: string,
  optionId: string,
  body: Partial<{
    label: string
    shortLabel: string | null
    sortOrder: number
    notes: string | null
  }>,
) {
  return requestJson<ElectionBallotOptionDto>(
    `/elections/${encodeURIComponent(electionId)}/ballot-options/${encodeURIComponent(optionId)}`,
    { method: 'PATCH', body: JSON.stringify(body) },
  )
}

export async function deleteBallotOption(electionId: string, optionId: string) {
  return requestJson<void>(
    `/elections/${encodeURIComponent(electionId)}/ballot-options/${encodeURIComponent(optionId)}`,
    { method: 'DELETE' },
  )
}

export async function upsertBallotOptionResult(
  electionId: string,
  optionId: string,
  body: {
    votes?: string | null
    voteSharePercent?: string | null
    notes?: string | null
  },
) {
  return requestJson<unknown>(
    `/elections/${encodeURIComponent(electionId)}/ballot-options/${encodeURIComponent(optionId)}/result`,
    { method: 'PUT', body: JSON.stringify(body) },
  )
}

export async function upsertElectionPartyResult(
  electionId: string,
  partyId: string,
  body: {
    votes?: string | null
    voteSharePercent?: string | null
    seatsWon?: number | null
    notes?: string | null
  },
) {
  return requestJson<ElectionPartyResultDto>(
    `/elections/${encodeURIComponent(electionId)}/party-results/${encodeURIComponent(partyId)}`,
    { method: 'PUT', body: JSON.stringify(body) },
  )
}

export async function deleteElectionPartyResult(
  electionId: string,
  partyId: string,
) {
  return requestJson<void>(
    `/elections/${encodeURIComponent(electionId)}/party-results/${encodeURIComponent(partyId)}`,
    { method: 'DELETE' },
  )
}

/** UI 셀렉트용 — API ElectionType enum 값과 동일 */
export const ELECTION_TYPE_OPTIONS: { value: string; label: string }[] = [
  { value: 'PRESIDENTIAL_OR_HEAD', label: '대통령·수반 직선' },
  { value: 'PARLIAMENTARY_CONSTITUENCY', label: '국회·의회 지역구' },
  { value: 'PARLIAMENTARY_PROPORTIONAL', label: '비례대표' },
  { value: 'LOCAL', label: '지방선거' },
  { value: 'BY_ELECTION', label: '보궐·중간선거' },
  { value: 'PRIMARY', label: '경선·예비선거' },
  { value: 'REFERENDUM_OR_PLEBISCITE', label: '국민투표·다중 안건' },
  { value: 'OTHER', label: '기타' },
]

export const ELECTION_STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: 'SCHEDULED', label: '예정' },
  { value: 'IN_PROGRESS', label: '진행' },
  { value: 'FINALIZED', label: '마감' },
  { value: 'CANCELLED', label: '취소' },
]

export const NOMINATION_TYPE_OPTIONS: { value: string; label: string }[] = [
  { value: 'PARTY_NOMINATION', label: '정당 공천' },
  { value: 'INDEPENDENT', label: '무소속' },
  { value: 'WRITE_IN', label: '속기·입후보' },
  { value: 'PARTY_LIST_ONLY', label: '비례 명부(정당)' },
  { value: 'OTHER', label: '기타' },
]

export function labelElectionType(value: string) {
  return ELECTION_TYPE_OPTIONS.find((o) => o.value === value)?.label ?? value
}

export function labelElectionStatus(value: string) {
  return ELECTION_STATUS_OPTIONS.find((o) => o.value === value)?.label ?? value
}

export function labelNominationType(value: string) {
  return NOMINATION_TYPE_OPTIONS.find((o) => o.value === value)?.label ?? value
}

export const LEGISLATURE_CLOSURE_KIND_OPTIONS: { value: string; label: string }[] =
  [
    { value: 'FULL_TERM', label: '정식 임기 만료' },
    { value: 'EARLY_DISSOLUTION', label: '조기 해산' },
    { value: 'NO_CONFIDENCE', label: '불신임·내각 총사퇴' },
    { value: 'HEAD_DISSOLUTION_DECREE', label: '수반 해산권·명령' },
    { value: 'REFERENDUM_OR_PLEBISCITE', label: '국민투표·개헌' },
    { value: 'JUDICIAL_OR_CONSTITUTIONAL', label: '사법·헌법재판' },
    { value: 'OTHER', label: '기타' },
  ]

export function labelLegislatureClosureKind(value: string) {
  return (
    LEGISLATURE_CLOSURE_KIND_OPTIONS.find((o) => o.value === value)?.label ??
    value
  )
}

// --- Cabinet — political parties ---
export type CabinetPartyProvenanceValue =
  | 'MANUAL'
  | 'FROM_ELECTION_PARTY_RESULT'
  | 'FROM_HEAD_CANDIDACY'
  | 'OTHER'

export type CabinetPartyLink = {
  id: string
  cabinetId: string
  partyId: string
  role: string
  notes?: string | null
  provenance?: CabinetPartyProvenanceValue
  electionPartyResultId?: string | null
  party?: { id: string; name: string; shortName?: string | null }
  electionPartyResult?: {
    id: string
    election?: { id: string; name: string; pollDate?: string | null } | null
  } | null
}

export async function getCabinetPoliticalParties(cabinetId: string) {
  return requestJson<CabinetPartyLink[]>(
    `/government-positions/cabinets/${encodeURIComponent(cabinetId)}/political-parties`,
  )
}

export async function addCabinetPoliticalParty(
  cabinetId: string,
  body: {
    partyId: string
    role: string
    notes?: string | null
    provenance?: CabinetPartyProvenanceValue
    electionPartyResultId?: string | null
  },
) {
  return requestJson<CabinetPartyLink>(
    `/government-positions/cabinets/${encodeURIComponent(cabinetId)}/political-parties`,
    { method: 'POST', body: JSON.stringify(body) },
  )
}

export async function removeCabinetPoliticalParty(
  cabinetId: string,
  linkId: string,
) {
  return requestJson<void>(
    `/government-positions/cabinets/${encodeURIComponent(cabinetId)}/political-parties/${encodeURIComponent(linkId)}`,
    { method: 'DELETE' },
  )
}
