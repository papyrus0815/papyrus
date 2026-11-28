import { getPoliticalParties as fetchParties, type PoliticalPartyRow } from '../election'
import type { Citation, CitationInput } from '../evidence'

export type PoliticalPosition =
  | 'FAR_LEFT'
  | 'LEFT'
  | 'CENTER_LEFT'
  | 'CENTER'
  | 'CENTER_RIGHT'
  | 'RIGHT'
  | 'FAR_RIGHT'
  | 'BIG_TENT'

export const POLITICAL_POSITION_LABEL: Record<PoliticalPosition, string> = {
  FAR_LEFT: '극좌',
  LEFT: '좌파',
  CENTER_LEFT: '중도좌파',
  CENTER: '중도',
  CENTER_RIGHT: '중도우파',
  RIGHT: '우파',
  FAR_RIGHT: '극우',
  BIG_TENT: '포괄·빅텐트',
}

export const POLITICAL_POSITION_COLOR: Record<PoliticalPosition, string> = {
  FAR_LEFT: '#b91c1c',
  LEFT: '#e11d48',
  CENTER_LEFT: '#f97316',
  CENTER: '#eab308',
  CENTER_RIGHT: '#0284c7',
  RIGHT: '#2563eb',
  FAR_RIGHT: '#4338ca',
  BIG_TENT: '#0d9488',
}

/** 구조화 날짜 입력 — year는 크기값, 기원전은 era='BC'. 월 없는 일은 서버가 버린다 */
export type StructuredDateInput = {
  era: 'BC' | 'AD'
  year: number
  month?: number
  day?: number
}

/** 정당 종류 — 근대 정당만이 아니라 운동·붕당·교섭단체·공동 명부까지 */
export type PoliticalPartyKind =
  | 'PARTY'
  | 'MOVEMENT'
  | 'FACTION'
  | 'PARLIAMENTARY_GROUP'
  | 'ELECTORAL_LIST'
  | 'OTHER'

export const POLITICAL_PARTY_KIND_OPTIONS: Array<{ value: PoliticalPartyKind; label: string; hint: string }> = [
  { value: 'PARTY', label: '정당', hint: '근대 정당' },
  { value: 'MOVEMENT', label: '정치 운동', hint: '정당으로 조직되기 전 단계 — 전투 파쇼(1919)' },
  { value: 'FACTION', label: '붕당·파벌', hint: '선거 없는 정치 집단 — 동인·서인, 옵티마테스' },
  { value: 'PARLIAMENTARY_GROUP', label: '의회 클럽·교섭단체', hint: '원내 집단' },
  { value: 'ELECTORAL_LIST', label: '공동 명부', hint: '여러 정당이 한 명부로 한 정당처럼 득표' },
  { value: 'OTHER', label: '기타', hint: '' },
]

export function labelPoliticalPartyKind(kind: string | null | undefined): string {
  return POLITICAL_PARTY_KIND_OPTIONS.find((option) => option.value === kind)?.label ?? '정당'
}

/** 정당 이름 유형 */
export type PoliticalPartyAliasType =
  | 'OFFICIAL'
  | 'LOCAL_NAME'
  | 'TRANSLATION'
  | 'COMMON'
  | 'ACRONYM'
  | 'ALIAS'
  | 'FORMER_NAME'

export const POLITICAL_PARTY_ALIAS_TYPE_OPTIONS: Array<{
  value: PoliticalPartyAliasType
  label: string
  hint: string
}> = [
  { value: 'OFFICIAL', label: '공식명(기간)', hint: '그 기간의 공식 명칭 — 개명 이력' },
  { value: 'LOCAL_NAME', label: '원어명', hint: 'Partito Nazionale Fascista' },
  { value: 'TRANSLATION', label: '번역명', hint: 'National Fascist Party' },
  { value: 'COMMON', label: '통칭', hint: '파시스트당' },
  { value: 'ACRONYM', label: '약칭', hint: 'PNF' },
  { value: 'ALIAS', label: '별칭', hint: '비공식 명칭' },
  { value: 'FORMER_NAME', label: '과거명(구)', hint: '예전 입력 — 새로는 공식명 + 기간' },
]

export function labelPoliticalPartyAliasType(type: string | null | undefined): string {
  return POLITICAL_PARTY_ALIAS_TYPE_OPTIONS.find((option) => option.value === type)?.label ?? type ?? ''
}

/** 구조화 기간 칸(응답) — start·end 접두 */
export type StructuredPeriodFields = {
  startEra?: 'BC' | 'AD' | null
  startYear?: number | null
  startMonth?: number | null
  startDay?: number | null
  startPrecision?: string | null
  endEra?: 'BC' | 'AD' | null
  endYear?: number | null
  endMonth?: number | null
  endDay?: number | null
  endPrecision?: string | null
}

export type PoliticalPartyAliasDto = StructuredPeriodFields & {
  id: string
  partyId: string
  name: string
  type: PoliticalPartyAliasType
  languageCode?: string | null
  isPrimary: boolean
  note?: string | null
  sortOrder: number
}

export type PoliticalPartyAliasInput = {
  name: string
  type: PoliticalPartyAliasType
  languageCode?: string | null
  isPrimary?: boolean
  start?: StructuredDateInput | null
  end?: StructuredDateInput | null
  note?: string | null
  sortOrder?: number
}

/** 정당 법적 지위 */
export type PoliticalPartyLegalStatusKind =
  | 'LEGAL'
  | 'SOLE_LEGAL'
  | 'RULING_STATE_PARTY'
  | 'BANNED'
  | 'UNDERGROUND'
  | 'IN_EXILE'
  | 'SUSPENDED'
  | 'CONSTITUTIONALLY_DISSOLVED'
  | 'OTHER'

export const POLITICAL_PARTY_LEGAL_STATUS_OPTIONS: Array<{
  value: PoliticalPartyLegalStatusKind
  label: string
  hint: string
}> = [
  { value: 'LEGAL', label: '합법', hint: '합법 활동' },
  { value: 'SOLE_LEGAL', label: '유일 합법 정당', hint: '다른 정당이 금지된 체제의 유일 정당' },
  { value: 'RULING_STATE_PARTY', label: '당-국가', hint: '당이 국가 기구 위에 선다' },
  { value: 'BANNED', label: '불법화', hint: '금지·불법 단체 지정' },
  { value: 'UNDERGROUND', label: '지하 활동', hint: '금지 아래 비밀 활동' },
  { value: 'IN_EXILE', label: '망명', hint: '국외에서 활동' },
  { value: 'SUSPENDED', label: '활동 정지', hint: '일시 정지' },
  { value: 'CONSTITUTIONALLY_DISSOLVED', label: '강제 해산', hint: '헌법재판·사법 판결로 해산' },
  { value: 'OTHER', label: '기타', hint: '' },
]

export function labelPoliticalPartyLegalStatus(status: string | null | undefined): string {
  return POLITICAL_PARTY_LEGAL_STATUS_OPTIONS.find((option) => option.value === status)?.label ?? status ?? ''
}

export type PoliticalPartyLegalStatusDto = StructuredPeriodFields & {
  id: string
  partyId: string
  status: PoliticalPartyLegalStatusKind
  isCurrent: boolean
  lawId?: string | null
  eventId?: string | null
  law?: { id: string; name: string } | null
  event?: { id: string; title: string } | null
  note?: string | null
  sortOrder: number
}

export type PoliticalPartyLegalStatusInput = {
  status: PoliticalPartyLegalStatusKind
  start?: StructuredDateInput | null
  end?: StructuredDateInput | null
  isCurrent?: boolean
  lawId?: string | null
  eventId?: string | null
  note?: string | null
  sortOrder?: number
}

/** 정당 기록의 인용 대상 — 정당 본체 + 곁가지 9종 */
export type PartyCitationTargetType =
  | 'POLITICAL_PARTY'
  | 'PARTY_ALIAS'
  | 'PARTY_LEGAL_STATUS'
  | 'PARTY_IDEOLOGY'
  | 'PARTY_POSITION_PERIOD'
  | 'PARTY_ORGANIZATION'
  | 'PARTY_MEMBERSHIP'
  | 'PARTY_SYMBOL'
  | 'PARTY_EXPRESSION'
  | 'PARTY_HEADQUARTERS'
  | 'PARTY_LINK'

export type PartyCitationGroupDto = {
  targetType: PartyCitationTargetType
  targetId: string
  citations: Citation[]
}

/** 표지 이미지 종류 */
export type PartySymbolKind = 'LOGO' | 'FLAG' | 'EMBLEM' | 'BALLOT_SYMBOL' | 'PHOTO' | 'POSTER' | 'OTHER'

export const PARTY_SYMBOL_KIND_OPTIONS: Array<{ value: PartySymbolKind; label: string; hint: string }> = [
  { value: 'LOGO', label: '로고·휘장', hint: '대표 로고는 목록·카드에 쓰인다' },
  { value: 'FLAG', label: '당기', hint: '' },
  { value: 'EMBLEM', label: '상징물', hint: '파스케스, 낫과 망치' },
  { value: 'BALLOT_SYMBOL', label: '투표 상징', hint: '인도 국민회의의 손바닥 — 기표용 그림' },
  { value: 'PHOTO', label: '사진', hint: '당사·집회' },
  { value: 'POSTER', label: '포스터·선전물', hint: '' },
  { value: 'OTHER', label: '기타', hint: '' },
]

export function labelPartySymbolKind(kind: string | null | undefined): string {
  return PARTY_SYMBOL_KIND_OPTIONS.find((option) => option.value === kind)?.label ?? kind ?? ''
}

export type PartySymbolDto = StructuredPeriodFields & {
  id: string
  partyId: string
  kind: PartySymbolKind
  imageUrl: string
  caption?: string | null
  isPrimary: boolean
  sortOrder: number
}

export type PartySymbolInput = {
  kind: PartySymbolKind
  imageUrl: string
  caption?: string | null
  isPrimary?: boolean
  start?: StructuredDateInput | null
  end?: StructuredDateInput | null
}

/** 표현(말·노래) 종류 */
export type PartyExpressionKind = 'MOTTO' | 'SLOGAN' | 'ANTHEM' | 'PARTY_SONG' | 'SALUTE' | 'OTHER'

export const PARTY_EXPRESSION_KIND_OPTIONS: Array<{ value: PartyExpressionKind; label: string; hint: string }> = [
  { value: 'MOTTO', label: '표어', hint: 'Credere, Obbedire, Combattere' },
  { value: 'SLOGAN', label: '구호', hint: '선거 구호' },
  { value: 'ANTHEM', label: '당가', hint: '원문에는 제목 — Giovinezza' },
  { value: 'PARTY_SONG', label: '당 노래', hint: '당가 외 노래' },
  { value: 'SALUTE', label: '인사법·경례', hint: '' },
  { value: 'OTHER', label: '기타', hint: '' },
]

export function labelPartyExpressionKind(kind: string | null | undefined): string {
  return PARTY_EXPRESSION_KIND_OPTIONS.find((option) => option.value === kind)?.label ?? kind ?? ''
}

export type PartyExpressionDto = StructuredPeriodFields & {
  id: string
  partyId: string
  kind: PartyExpressionKind
  originalText: string
  languageCode?: string | null
  translation?: string | null
  mediaUrl?: string | null
  isPrimary: boolean
  note?: string | null
  sortOrder: number
}

export type PartyExpressionInput = {
  kind: PartyExpressionKind
  originalText: string
  languageCode?: string | null
  translation?: string | null
  mediaUrl?: string | null
  isPrimary?: boolean
  start?: StructuredDateInput | null
  end?: StructuredDateInput | null
  note?: string | null
}

/** 당사 이력 */
export type PartyHeadquartersDto = StructuredPeriodFields & {
  id: string
  partyId: string
  cityId?: string | null
  city?: { id: string; name: string; localName?: string | null } | null
  buildingName?: string | null
  address?: string | null
  isCurrent: boolean
  note?: string | null
  sortOrder: number
}

export type PartyHeadquartersInput = {
  cityId?: string | null
  buildingName?: string | null
  address?: string | null
  start?: StructuredDateInput | null
  end?: StructuredDateInput | null
  isCurrent?: boolean
  note?: string | null
}

/** 정당 산하·연계 조직에서 그 조직이 맡은 자리 */
export type PartyOrganizationRole =
  | 'GOVERNING_ORGAN'
  | 'YOUTH_WING'
  | 'STUDENT_WING'
  | 'WOMEN_WING'
  | 'PARAMILITARY_WING'
  | 'OFFICIAL_MEDIA'
  | 'THINK_TANK'
  | 'TRADE_UNION'
  | 'PARLIAMENTARY_GROUP'
  | 'REGIONAL_BRANCH'
  | 'OVERSEAS_BRANCH'
  | 'INTERNATIONAL_MEMBERSHIP'
  | 'ALLIANCE_MEMBERSHIP'
  | 'OTHER'

export const PARTY_ORGANIZATION_ROLE_OPTIONS: Array<{ value: PartyOrganizationRole; label: string; hint: string }> = [
  { value: 'GOVERNING_ORGAN', label: '지도 기구', hint: '대평의회·중앙위원회·정치국' },
  { value: 'YOUTH_WING', label: '청년 조직', hint: '발릴라, 히틀러 유겐트, 콤소몰' },
  { value: 'STUDENT_WING', label: '학생 조직', hint: '' },
  { value: 'WOMEN_WING', label: '여성 조직', hint: '' },
  { value: 'PARAMILITARY_WING', label: '준군사조직', hint: '검은 셔츠단, SA — 정규 무력이 됐으면 군부대로' },
  { value: 'OFFICIAL_MEDIA', label: '기관지·당 매체', hint: '이탈리아 인민, 프라우다' },
  { value: 'THINK_TANK', label: '싱크탱크·재단', hint: '' },
  { value: 'TRADE_UNION', label: '계열 노조', hint: '' },
  { value: 'PARLIAMENTARY_GROUP', label: '원내 교섭단체', hint: '' },
  { value: 'REGIONAL_BRANCH', label: '지역 지부', hint: '대관구, 지역 지도부' },
  { value: 'OVERSEAS_BRANCH', label: '해외 지부', hint: '' },
  { value: 'INTERNATIONAL_MEMBERSHIP', label: '국제 조직 가입', hint: '코민테른, 사회주의 인터내셔널' },
  { value: 'ALLIANCE_MEMBERSHIP', label: '연합 참여', hint: '인민전선 등 지속 연합' },
  { value: 'OTHER', label: '기타', hint: '' },
]

export function labelPartyOrganizationRole(role: string | null | undefined): string {
  return PARTY_ORGANIZATION_ROLE_OPTIONS.find((option) => option.value === role)?.label ?? role ?? ''
}

export type PartyOrganizationLinkDto = StructuredPeriodFields & {
  id: string
  partyId: string
  role: PartyOrganizationRole
  organizationId?: string | null
  militaryUnitId?: string | null
  note?: string | null
  sortOrder: number
  organization?: {
    id: string
    name: string
    shortName?: string | null
    localName?: string | null
    type: string
    foundedDate?: string | null
    dissolvedDate?: string | null
  } | null
  militaryUnit?: {
    id: string
    name: string
    nameEn?: string | null
    unitType?: string | null
    establishedDate?: string | null
    disbandedDate?: string | null
  } | null
}

export type PartyOrganizationCandidate =
  | { kind: 'organization'; id: string; name: string; shortName?: string | null; localName?: string | null; type: string; foundedDate?: string | null }
  | { kind: 'militaryUnit'; id: string; name: string; nameEn?: string | null; unitType?: string | null; establishedDate?: string | null }

export type CreatePartyOrganizationInput = {
  role: PartyOrganizationRole
  organizationId?: string | null
  militaryUnitId?: string | null
  newOrganization?: { name: string; localName?: string | null; type?: string | null } | null
  start?: StructuredDateInput | null
  end?: StructuredDateInput | null
  note?: string | null
}

export type UpdatePartyOrganizationInput = {
  role?: PartyOrganizationRole
  start?: StructuredDateInput | null
  end?: StructuredDateInput | null
  note?: string | null
}

/** 정당 × 이념 카탈로그 연결 */
export type PartyIdeologyLinkDto = StructuredPeriodFields & {
  id: string
  partyId: string
  ideologyId: string
  isPrimary: boolean
  note?: string | null
  sortOrder: number
  ideology: {
    id: string
    name: string
    englishName?: string | null
    category: 'IDEOLOGY' | 'POLICY' | 'INTEREST' | 'OTHER'
    parent?: { id: string; name: string } | null
  }
}

export type PartyIdeologyLinkInput = {
  isPrimary?: boolean
  start?: StructuredDateInput | null
  end?: StructuredDateInput | null
  note?: string | null
}

/** 스펙트럼 기간 */
export type PartyPositionPeriodDto = StructuredPeriodFields & {
  id: string
  partyId: string
  position: PoliticalPosition
  isCurrent: boolean
  note?: string | null
  sortOrder: number
}

export type PartyPositionPeriodInput = {
  position: PoliticalPosition
  start?: StructuredDateInput | null
  end?: StructuredDateInput | null
  isCurrent?: boolean
  note?: string | null
}

/** 정당 사이 관계 종류 — 계보(전신·후신)와 선거 한 번의 연합은 따로 */
export type PoliticalPartyLinkKind = 'SISTER_PARTY' | 'SATELLITE_OF' | 'FACTION_OF' | 'PARLIAMENTARY_UNION' | 'OTHER'

/** 대칭 종류 — 방향 없음(자매·공동 교섭단체·기타) */
export const SYMMETRIC_PARTY_LINK_KINDS: ReadonlySet<PoliticalPartyLinkKind> = new Set(['SISTER_PARTY', 'PARLIAMENTARY_UNION', 'OTHER'])

export type PartyLinkPartySummary = {
  id: string
  name: string
  shortName?: string | null
  brandColor?: string | null
  country?: { id: string; name: string } | null
  historicalCountry?: { id: string; name: string } | null
}

/** 관계 한 줄 — 요청한 정당 입장. role: peer(대칭) / subordinate(이 정당이 상대의 위성·계파) / superior(상대가 이 정당의) */
export type PartyLinkDto = StructuredPeriodFields & {
  id: string
  kind: PoliticalPartyLinkKind
  role: 'peer' | 'subordinate' | 'superior'
  otherPartyId: string
  otherParty: PartyLinkPartySummary
  note?: string | null
  sortOrder: number
}

export type PartyLinkInput = {
  otherPartyId: string
  kind: PoliticalPartyLinkKind
  role?: 'subordinate' | 'superior'
  start?: StructuredDateInput | null
  end?: StructuredDateInput | null
  note?: string | null
}

export type PoliticalPartyCounts = {
  memberships?: number
  electionPartyResults?: number
  cabinetAffiliations?: number
  eventRelations?: number
  transitionsFrom?: number
  transitionsTo?: number
}

export type PoliticalParty = PoliticalPartyRow & {
  localName?: string | null
  ideology?: string | null
  position?: PoliticalPosition | null
  description?: string | null
  foundedDate?: string | null
  dissolvedDate?: string | null
  logoUrl?: string | null
  brandColor?: string | null
  /** 상징색 여러 개(#RRGGBB) */
  colorPalette?: string[] | null
  aliases?: PoliticalPartyAliasDto[]
  _count?: PoliticalPartyCounts
  createdAt?: string
  updatedAt?: string
}

export type CreatePoliticalPartyInput = {
  name: string
  shortName?: string | null
  localName?: string | null
  /** 이념 카탈로그 id(순서 = 표시 순서) — 정본. 주면 연결을 이 목록에 맞춘다 */
  ideologyIds?: string[]
  /** @deprecated 문자열 이념 — 서버가 카탈로그로 풀어 연결한다(빠른 등록 등 구 호출부) */
  ideology?: string | null
  position?: PoliticalPosition | null
  kind?: PoliticalPartyKind
  description?: string | null
  /** 구조화 창당일(정본) — null이면 지우기 */
  founded?: StructuredDateInput | null
  /** 구조화 해산일(정본) */
  dissolved?: StructuredDateInput | null
  /** @deprecated ISO — founded가 정본(빠른 등록 등 구 호출부 호환) */
  foundedDate?: string | null
  /** @deprecated ISO — dissolved가 정본 */
  dissolvedDate?: string | null
  logoUrl?: string | null
  /** UI·차트용 #RRGGBB */
  brandColor?: string | null
  /** 상징색 여러 개(#RRGGBB, 최대 12) — 비우면 null */
  colorPalette?: string[] | null
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
  /** 거울(AD1000+) — 정본은 effective* 구조화 칸 */
  effectiveDate?: string | null
  effectiveEra?: 'BC' | 'AD' | null
  effectiveYear?: number | null
  effectiveMonth?: number | null
  effectiveDay?: number | null
  effectivePrecision?: 'year' | 'month' | 'day' | null
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
  ordinal?: number | null
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
  /** 계보가 일어난 때(구조화) — null이면 지운다 */
  effective?: StructuredDateInput | null
  notes?: string | null
}

/** PATCH — 상대 정당(from/to) 변경 없음 */
export type UpdatePartyTransitionInput = {
  kind?: PoliticalPartyTransitionKind
  effective?: StructuredDateInput | null
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
      if (body) {
        /* 서버 오류 본문({ message })에서 문장만 — 알림에 JSON 원문이 뜨지 않게 */
        try {
          const parsed = JSON.parse(body) as { message?: string | string[] }
          msg = Array.isArray(parsed.message) ? parsed.message.join(' · ') : (parsed.message ?? body)
        } catch {
          msg = body
        }
      }
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
    chamberId?: string | null
    countryId?: string | null
    historicalCountryId?: string | null
    chamber?: {
      id: string
      name: string
      localName?: string | null
      role: string
      sizes?: Array<{
        id: string
        seats: number
        startEra?: string | null
        startYear?: number | null
        endEra?: string | null
        endYear?: number | null
      }>
    } | null
  } | null
}

/** GET /political-parties/:id/memberships */
export type PartyMembershipListRow = StructuredPeriodFields & {
  id: string
  personId: string
  partyId: string
  startDate?: string | null
  endDate?: string | null
  roleCategory?: string | null
  leadershipTier?: string | null
  roleTitle?: string | null
  notes?: string | null
  officeKind?: string | null
  officeOrdinal?: number | null
  isFounder?: boolean
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

/** GET /political-parties/:id/events */
export type PartyRelatedEventRow = {
  relationId: string
  role: string
  roleDescription?: string | null
  note?: string | null
  side?: {
    id: string
    name: string
    color?: string | null
    outcome?: string | null
  } | null
  event: {
    id: string
    title: string
    domain: string
    type?: string | null
    startDate?: string | null
    startEra?: string | null
    startYear?: number | null
    startMonth?: number | null
    startDay?: number | null
    endDate?: string | null
    endEra?: string | null
    endYear?: number | null
    endMonth?: number | null
    endDay?: number | null
  }
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

  /** 관련 역사 사건 (봉기·혁명·총파업·창당·해산 등) */
  getEvents: async (partyId: string) => {
    return requestJson<PartyRelatedEventRow[]>(
      `/political-parties/${encodeURIComponent(partyId)}/events`,
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

  /** 이름 이력 — 공식명(기간)·원어·번역·통칭·약칭 */
  getAliases: async (partyId: string) => {
    return requestJson<PoliticalPartyAliasDto[]>(`/political-parties/${encodeURIComponent(partyId)}/aliases`)
  },

  createAlias: async (partyId: string, body: PoliticalPartyAliasInput) => {
    return requestJson<PoliticalPartyAliasDto>(`/political-parties/${encodeURIComponent(partyId)}/aliases`, {
      method: 'POST',
      body: JSON.stringify(body),
    })
  },

  updateAlias: async (partyId: string, aliasId: string, body: Partial<PoliticalPartyAliasInput>) => {
    return requestJson<PoliticalPartyAliasDto>(
      `/political-parties/${encodeURIComponent(partyId)}/aliases/${encodeURIComponent(aliasId)}`,
      { method: 'PATCH', body: JSON.stringify(body) },
    )
  },

  deleteAlias: async (partyId: string, aliasId: string) => {
    await requestJson<void>(
      `/political-parties/${encodeURIComponent(partyId)}/aliases/${encodeURIComponent(aliasId)}`,
      { method: 'DELETE' },
    )
  },

  /** 정당 기록의 출처 — 본체·곁가지 전체를 대상별로(각 행 '출처 N'용) */
  getCitations: async (partyId: string) =>
    requestJson<PartyCitationGroupDto[]>(`/political-parties/${encodeURIComponent(partyId)}/citations`),

  /** 한 대상의 인용을 이 목록과 같게 — 빈 배열이면 모두 뗀다 */
  setCitations: async (
    partyId: string,
    body: { targetType: PartyCitationTargetType; targetId: string; citations: CitationInput[] },
  ) =>
    requestJson<PartyCitationGroupDto>(`/political-parties/${encodeURIComponent(partyId)}/citations`, {
      method: 'PUT',
      body: JSON.stringify(body),
    }),

  /** 표지 이미지 — 로고·당기·상징·투표 상징·사진·포스터 */
  getSymbols: async (partyId: string) =>
    requestJson<PartySymbolDto[]>(`/political-parties/${encodeURIComponent(partyId)}/symbols`),
  createSymbol: async (partyId: string, body: PartySymbolInput) =>
    requestJson<PartySymbolDto>(`/political-parties/${encodeURIComponent(partyId)}/symbols`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  updateSymbol: async (partyId: string, symbolId: string, body: Partial<PartySymbolInput>) =>
    requestJson<PartySymbolDto>(
      `/political-parties/${encodeURIComponent(partyId)}/symbols/${encodeURIComponent(symbolId)}`,
      { method: 'PATCH', body: JSON.stringify(body) },
    ),
  deleteSymbol: async (partyId: string, symbolId: string) => {
    await requestJson<void>(`/political-parties/${encodeURIComponent(partyId)}/symbols/${encodeURIComponent(symbolId)}`, {
      method: 'DELETE',
    })
  },

  /** 표현 — 표어·구호·당가·인사법 */
  getExpressions: async (partyId: string) =>
    requestJson<PartyExpressionDto[]>(`/political-parties/${encodeURIComponent(partyId)}/expressions`),
  createExpression: async (partyId: string, body: PartyExpressionInput) =>
    requestJson<PartyExpressionDto>(`/political-parties/${encodeURIComponent(partyId)}/expressions`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  updateExpression: async (partyId: string, expressionId: string, body: Partial<PartyExpressionInput>) =>
    requestJson<PartyExpressionDto>(
      `/political-parties/${encodeURIComponent(partyId)}/expressions/${encodeURIComponent(expressionId)}`,
      { method: 'PATCH', body: JSON.stringify(body) },
    ),
  deleteExpression: async (partyId: string, expressionId: string) => {
    await requestJson<void>(
      `/political-parties/${encodeURIComponent(partyId)}/expressions/${encodeURIComponent(expressionId)}`,
      { method: 'DELETE' },
    )
  },

  /** 당사 이력 — 지속 중(없으면 가장 늦은) 당사의 도시가 정당의 당사 도시 */
  getHeadquarters: async (partyId: string) =>
    requestJson<PartyHeadquartersDto[]>(`/political-parties/${encodeURIComponent(partyId)}/headquarters`),
  createHeadquarters: async (partyId: string, body: PartyHeadquartersInput) =>
    requestJson<PartyHeadquartersDto>(`/political-parties/${encodeURIComponent(partyId)}/headquarters`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  updateHeadquarters: async (partyId: string, hqId: string, body: Partial<PartyHeadquartersInput>) =>
    requestJson<PartyHeadquartersDto>(
      `/political-parties/${encodeURIComponent(partyId)}/headquarters/${encodeURIComponent(hqId)}`,
      { method: 'PATCH', body: JSON.stringify(body) },
    ),
  deleteHeadquarters: async (partyId: string, hqId: string) => {
    await requestJson<void>(
      `/political-parties/${encodeURIComponent(partyId)}/headquarters/${encodeURIComponent(hqId)}`,
      { method: 'DELETE' },
    )
  },

  /** 산하·연계 조직 — 조직·군부대에 역할·기간을 달아 잇는다 */
  getOrganizations: async (partyId: string) => {
    return requestJson<PartyOrganizationLinkDto[]>(`/political-parties/${encodeURIComponent(partyId)}/organizations`)
  },

  getOrganizationCandidates: async (partyId: string, params: { query?: string; target: 'organization' | 'militaryUnit' }) => {
    const search = new URLSearchParams({ target: params.target })
    if (params.query?.trim()) search.set('q', params.query.trim())
    return requestJson<PartyOrganizationCandidate[]>(
      `/political-parties/${encodeURIComponent(partyId)}/organization-candidates?${search.toString()}`,
    )
  },

  createOrganizationLink: async (partyId: string, body: CreatePartyOrganizationInput) => {
    return requestJson<PartyOrganizationLinkDto>(`/political-parties/${encodeURIComponent(partyId)}/organizations`, {
      method: 'POST',
      body: JSON.stringify(body),
    })
  },

  updateOrganizationLink: async (partyId: string, linkId: string, body: UpdatePartyOrganizationInput) => {
    return requestJson<PartyOrganizationLinkDto>(
      `/political-parties/${encodeURIComponent(partyId)}/organizations/${encodeURIComponent(linkId)}`,
      { method: 'PATCH', body: JSON.stringify(body) },
    )
  },

  deleteOrganizationLink: async (partyId: string, linkId: string) => {
    await requestJson<void>(
      `/political-parties/${encodeURIComponent(partyId)}/organizations/${encodeURIComponent(linkId)}`,
      { method: 'DELETE' },
    )
  },

  /** 이념 연결(카탈로그) — 순서·대표·기간·메모 */
  getIdeologies: async (partyId: string) => {
    return requestJson<PartyIdeologyLinkDto[]>(`/political-parties/${encodeURIComponent(partyId)}/ideologies`)
  },

  setIdeologies: async (partyId: string, ideologyIds: string[]) => {
    return requestJson<PartyIdeologyLinkDto[]>(`/political-parties/${encodeURIComponent(partyId)}/ideologies`, {
      method: 'PUT',
      body: JSON.stringify({ ideologyIds }),
    })
  },

  updateIdeologyLink: async (partyId: string, linkId: string, body: PartyIdeologyLinkInput) => {
    return requestJson<PartyIdeologyLinkDto>(
      `/political-parties/${encodeURIComponent(partyId)}/ideologies/${encodeURIComponent(linkId)}`,
      { method: 'PATCH', body: JSON.stringify(body) },
    )
  },

  deleteIdeologyLink: async (partyId: string, linkId: string) => {
    await requestJson<void>(
      `/political-parties/${encodeURIComponent(partyId)}/ideologies/${encodeURIComponent(linkId)}`,
      { method: 'DELETE' },
    )
  },

  /** 스펙트럼 기간 — 지속 중 행이 대표 스펙트럼이 된다 */
  getPositionPeriods: async (partyId: string) => {
    return requestJson<PartyPositionPeriodDto[]>(`/political-parties/${encodeURIComponent(partyId)}/position-periods`)
  },

  createPositionPeriod: async (partyId: string, body: PartyPositionPeriodInput) => {
    return requestJson<PartyPositionPeriodDto>(`/political-parties/${encodeURIComponent(partyId)}/position-periods`, {
      method: 'POST',
      body: JSON.stringify(body),
    })
  },

  updatePositionPeriod: async (partyId: string, periodId: string, body: Partial<PartyPositionPeriodInput>) => {
    return requestJson<PartyPositionPeriodDto>(
      `/political-parties/${encodeURIComponent(partyId)}/position-periods/${encodeURIComponent(periodId)}`,
      { method: 'PATCH', body: JSON.stringify(body) },
    )
  },

  deletePositionPeriod: async (partyId: string, periodId: string) => {
    await requestJson<void>(
      `/political-parties/${encodeURIComponent(partyId)}/position-periods/${encodeURIComponent(periodId)}`,
      { method: 'DELETE' },
    )
  },

  /** 정당 사이 관계 — 자매·위성·계파·공동 교섭단체. 한 행을 두 정당이 함께 본다 */
  getLinks: async (partyId: string) =>
    requestJson<PartyLinkDto[]>(`/political-parties/${encodeURIComponent(partyId)}/links`),

  getLinkCandidates: async (partyId: string, query: string) =>
    requestJson<PartyLinkPartySummary[]>(
      `/political-parties/${encodeURIComponent(partyId)}/link-candidates?query=${encodeURIComponent(query)}`,
    ),

  createLink: async (partyId: string, body: PartyLinkInput) =>
    requestJson<PartyLinkDto>(`/political-parties/${encodeURIComponent(partyId)}/links`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  updateLink: async (partyId: string, linkId: string, body: Partial<PartyLinkInput>) =>
    requestJson<PartyLinkDto>(
      `/political-parties/${encodeURIComponent(partyId)}/links/${encodeURIComponent(linkId)}`,
      { method: 'PATCH', body: JSON.stringify(body) },
    ),

  deleteLink: async (partyId: string, linkId: string) => {
    await requestJson<void>(
      `/political-parties/${encodeURIComponent(partyId)}/links/${encodeURIComponent(linkId)}`,
      { method: 'DELETE' },
    )
  },

  /** 법적 지위 기간 — 합법·유일 합법·불법화·강제 해산 */
  getLegalStatuses: async (partyId: string) => {
    return requestJson<PoliticalPartyLegalStatusDto[]>(
      `/political-parties/${encodeURIComponent(partyId)}/legal-statuses`,
    )
  },

  createLegalStatus: async (partyId: string, body: PoliticalPartyLegalStatusInput) => {
    return requestJson<PoliticalPartyLegalStatusDto>(
      `/political-parties/${encodeURIComponent(partyId)}/legal-statuses`,
      { method: 'POST', body: JSON.stringify(body) },
    )
  },

  updateLegalStatus: async (
    partyId: string,
    statusId: string,
    body: Partial<PoliticalPartyLegalStatusInput>,
  ) => {
    return requestJson<PoliticalPartyLegalStatusDto>(
      `/political-parties/${encodeURIComponent(partyId)}/legal-statuses/${encodeURIComponent(statusId)}`,
      { method: 'PATCH', body: JSON.stringify(body) },
    )
  },

  deleteLegalStatus: async (partyId: string, statusId: string) => {
    await requestJson<void>(
      `/political-parties/${encodeURIComponent(partyId)}/legal-statuses/${encodeURIComponent(statusId)}`,
      { method: 'DELETE' },
    )
  },
}
