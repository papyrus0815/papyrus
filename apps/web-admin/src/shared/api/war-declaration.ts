/**
 * 선전포고 · 개전 원장(WarDeclaration) 프론트 API 래퍼 및 정본 메타데이터.
 */
import { getApiConnection } from './client'

export type EraValue = 'BC' | 'AD'

export type WarDeclarationKind =
  | 'FORMAL_DECLARATION'
  | 'ULTIMATUM_EXPIRY'
  | 'ALLIANCE_ENTRY'
  | 'UNDECLARED_HOSTILITIES'
  | 'CO_BELLIGERENCY'
  | 'DIPLOMATIC_SEVERANCE'

export type WarTerminationKind =
  | 'PEACE_TREATY'
  | 'ARMISTICE'
  | 'SURRENDER'
  | 'STATE_EXTINCTION'
  | 'UNILATERAL_DECLARATION'
  | 'ONGOING'

export type WarDeclarationDirectionFilter = 'ALL' | 'ISSUED' | 'RECEIVED'

export const WAR_DECLARATION_KIND_LABELS: Record<WarDeclarationKind, string> = {
  FORMAL_DECLARATION: '공식 선전포고',
  ULTIMATUM_EXPIRY: '최후통첩 만료 개전',
  ALLIANCE_ENTRY: '동맹 의무 참전',
  UNDECLARED_HOSTILITIES: '무선전 기습·개전',
  CO_BELLIGERENCY: '재참전·공동교전 선언',
  DIPLOMATIC_SEVERANCE: '국교 단절·통첩',
}

export const WAR_DECLARATION_KIND_HINTS: Record<WarDeclarationKind, string> = {
  FORMAL_DECLARATION: '개전 포고문·칙령·외교 각서 등 공식 절차로 전쟁 상태를 선포',
  ULTIMATUM_EXPIRY: '최후통첩 시한 거절·만료로 자동 개전 (예: 1914 영국 대독 개전)',
  ALLIANCE_ENTRY: '상호방위조약·동맹 의무에 따라 참전을 선언',
  UNDECLARED_HOSTILITIES: '선전포고 없이 무력 기습·침공으로 개전 (사후 포고 포함)',
  CO_BELLIGERENCY: '휴전·정권 교체 후 진영을 바꾸거나 재참전 선포 (예: 1943 이탈리아 대독)',
  DIPLOMATIC_SEVERANCE: '개전에 앞선 외교 단교·공사관 철수 통첩',
}

export const WAR_DECLARATION_KIND_ORDER: WarDeclarationKind[] = [
  'FORMAL_DECLARATION',
  'ULTIMATUM_EXPIRY',
  'ALLIANCE_ENTRY',
  'UNDECLARED_HOSTILITIES',
  'CO_BELLIGERENCY',
  'DIPLOMATIC_SEVERANCE',
]

export const WAR_TERMINATION_KIND_LABELS: Record<WarTerminationKind, string> = {
  PEACE_TREATY: '강화·평화 조약',
  ARMISTICE: '휴전·정전 협정',
  SURRENDER: '항복 조인',
  STATE_EXTINCTION: '일방 소멸·병합',
  UNILATERAL_DECLARATION: '전쟁상태 종료 선언',
  ONGOING: '교전·휴전 지속',
}

export const WAR_TERMINATION_KIND_ORDER: WarTerminationKind[] = [
  'PEACE_TREATY',
  'ARMISTICE',
  'SURRENDER',
  'UNILATERAL_DECLARATION',
  'STATE_EXTINCTION',
  'ONGOING',
]

export interface WarDeclarationCountryRef {
  id: string
  name: string
  flagEmoji?: string | null
  thumbnailUrl?: string | null
}

export interface WarDeclarationDto {
  id: string

  declaringCountryId: string | null
  declaringCountry: WarDeclarationCountryRef | null
  declaringHistoricalCountryId: string | null
  declaringHistoricalCountry: WarDeclarationCountryRef | null

  targetCountryId: string | null
  targetCountry: WarDeclarationCountryRef | null
  targetHistoricalCountryId: string | null
  targetHistoricalCountry: WarDeclarationCountryRef | null

  kind: WarDeclarationKind
  title: string | null
  displayTitle: string
  casusBelli: string | null
  summary: string | null

  declaredDate: string | null
  declaredEra: EraValue | null
  declaredYear: number | null
  declaredMonth: number | null
  declaredDay: number | null
  declaredPrecision: string | null

  severanceEra: EraValue | null
  severanceYear: number | null
  severanceMonth: number | null
  severanceDay: number | null

  cabinetId: string | null
  cabinet: { id: string; name: string | null } | null
  decidedByPersonId: string | null
  decidedByPerson: {
    id: string
    name: string | null
    surname: string | null
    middleName: string | null
    nameDisplayOrder: string | null
    profileImageUrl: string | null
    defaultNameDisplayOrder: string | null
  } | null
  decidedByTenureId: string | null
  decidedByTenure: {
    id: string
    title: string | null
    rankTitle: string | null
    positionType: string
    positionDefinition: {
      id: string
      title: string
      positionType: string
    } | null
  } | null

  approvedChamberId: string | null
  approvedChamber: {
    id: string
    name: string
    shortName: string | null
    localName: string | null
    role: string
  } | null
  yeas: number | null
  nays: number | null
  abstentions: number | null

  warEventId: string | null
  warEvent: {
    id: string
    title: string
    domain?: string
    type?: string | null
    startDate: string | null
    startEra: EraValue | null
    startYear: number | null
    startMonth: number | null
    startDay: number | null
    endDate?: string | null
    endEra?: EraValue | null
    endYear?: number | null
    endMonth?: number | null
    endDay?: number | null
  } | null

  ultimatumEventId: string | null
  ultimatumEvent: {
    id: string
    title: string
    description?: string | null
    domain?: string
    type?: string | null
    startDate: string | null
    startEra: EraValue | null
    startYear: number | null
    startMonth: number | null
    startDay: number | null
  } | null

  narrativeEventId: string | null
  narrativeEvent: {
    id: string
    title: string
    description?: string | null
    domain?: string
    type?: string | null
    startDate: string | null
    startEra: EraValue | null
    startYear: number | null
    startMonth: number | null
    startDay: number | null
  } | null

  terminationKind: WarTerminationKind | null
  endedDate: string | null
  endedEra: EraValue | null
  endedYear: number | null
  endedMonth: number | null
  endedDay: number | null
  endedPrecision: string | null
  peaceTreatyId: string | null
  peaceTreaty: {
    id: string
    name: string
    alias: string | null
    type: string
    signDate: string
    effectiveDate: string | null
  } | null
  terminationNote: string | null

  createdAt: string
  updatedAt: string
}

export interface CreateWarDeclarationInput {
  declaringCountryId?: string | null
  declaringHistoricalCountryId?: string | null
  targetCountryId?: string | null
  targetHistoricalCountryId?: string | null

  kind?: WarDeclarationKind
  title?: string | null
  casusBelli?: string | null
  summary?: string | null

  declaredEra?: EraValue | null
  declaredYear?: number | null
  declaredMonth?: number | null
  declaredDay?: number | null
  declaredPrecision?: string | null

  severanceEra?: EraValue | null
  severanceYear?: number | null
  severanceMonth?: number | null
  severanceDay?: number | null

  cabinetId?: string | null
  decidedByPersonId?: string | null
  decidedByTenureId?: string | null
  approvedChamberId?: string | null
  yeas?: number | null
  nays?: number | null
  abstentions?: number | null

  warEventId?: string | null
  ultimatumEventId?: string | null
  narrativeEventId?: string | null
  createNarrativeEvent?: {
    title?: string | null
    description?: string | null
    background?: string | null
    aftermath?: string | null
    domain?: 'DIPLOMACY' | 'MILITARY' | 'POLITICS' | null
  } | null
  syncWarParticipantJoin?: boolean

  terminationKind?: WarTerminationKind | null
  endedEra?: EraValue | null
  endedYear?: number | null
  endedMonth?: number | null
  endedDay?: number | null
  endedPrecision?: string | null
  peaceTreatyId?: string | null
  terminationNote?: string | null
}

export type UpdateWarDeclarationInput = Partial<CreateWarDeclarationInput>

export interface WarDeclarationPartyInput {
  countryId?: string | null
  historicalCountryId?: string | null
}

export interface BatchCreateWarDeclarationInput
  extends Omit<
    CreateWarDeclarationInput,
    | 'declaringCountryId'
    | 'declaringHistoricalCountryId'
    | 'targetCountryId'
    | 'targetHistoricalCountryId'
  > {
  declaringParties: WarDeclarationPartyInput[]
  targetParties: WarDeclarationPartyInput[]
}

export interface ListWarDeclarationsQuery {
  countryId?: string
  historicalCountryId?: string
  includeConstituents?: boolean
  direction?: WarDeclarationDirectionFilter
  kind?: WarDeclarationKind
  warEventId?: string
  ultimatumEventId?: string
  narrativeEventId?: string
  peaceTreatyId?: string
}

export const warDeclarationKeys = {
  all: ['war-declarations'] as const,
  countryScope: (
    scopeKind: 'mod' | 'hist',
    id: string,
    includeConstituents?: boolean,
  ) =>
    [
      'war-declarations',
      scopeKind,
      id,
      includeConstituents ? 'constituents' : 'direct',
    ] as const,
  byNarrativeEvent: (eventId: string) =>
    ['war-declarations', 'narrative-event', eventId] as const,
  byWarEvent: (warEventId: string) =>
    ['war-declarations', 'war-event', warEventId] as const,
}

function unwrap<T>(raw: unknown): T {
  const wrapped = raw as { data?: T }
  return (wrapped?.data ?? raw) as T
}

async function requestJson<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const conn = getApiConnection()
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((conn.headers as Record<string, string> | undefined) ?? {}),
    ...((init?.headers as Record<string, string> | undefined) ?? {}),
  }
  const res = await fetch(`${conn.host}${path}`, {
    ...init,
    headers,
    credentials: 'include',
  })
  if (!res.ok) {
    let message = `HTTP ${res.status}`
    try {
      const errBody = await res.json()
      message =
        errBody?.message ||
        errBody?.error?.message ||
        (typeof errBody === 'string' ? errBody : message)
    } catch {
      const text = await res.text().catch(() => '')
      if (text) message = text
    }
    throw new Error(Array.isArray(message) ? message.join(', ') : String(message))
  }
  if (res.status === 204) return undefined as T
  const text = await res.text()
  if (!text) return undefined as T
  return unwrap<T>(JSON.parse(text))
}

export const warDeclarationApi = {
  async list(query?: ListWarDeclarationsQuery): Promise<WarDeclarationDto[]> {
    const params = new URLSearchParams()
    if (query?.countryId) params.set('countryId', query.countryId)
    if (query?.historicalCountryId) {
      params.set('historicalCountryId', query.historicalCountryId)
    }
    if (query?.includeConstituents) params.set('includeConstituents', 'true')
    if (query?.direction && query.direction !== 'ALL') {
      params.set('direction', query.direction)
    }
    if (query?.kind) params.set('kind', query.kind)
    if (query?.warEventId) params.set('warEventId', query.warEventId)
    if (query?.ultimatumEventId) {
      params.set('ultimatumEventId', query.ultimatumEventId)
    }
    if (query?.narrativeEventId) {
      params.set('narrativeEventId', query.narrativeEventId)
    }
    if (query?.peaceTreatyId) params.set('peaceTreatyId', query.peaceTreatyId)
    const qs = params.toString()
    const rows = await requestJson<WarDeclarationDto[]>(
      `/war-declarations${qs ? `?${qs}` : ''}`,
      { method: 'GET' },
    )
    return Array.isArray(rows) ? rows : []
  },

  async getById(id: string): Promise<WarDeclarationDto> {
    return requestJson<WarDeclarationDto>(
      `/war-declarations/${encodeURIComponent(id)}`,
      { method: 'GET' },
    )
  },

  async create(dto: CreateWarDeclarationInput): Promise<WarDeclarationDto> {
    return requestJson<WarDeclarationDto>('/war-declarations', {
      method: 'POST',
      body: JSON.stringify(dto),
    })
  },

  async createBatch(
    dto: BatchCreateWarDeclarationInput,
  ): Promise<WarDeclarationDto[]> {
    return requestJson<WarDeclarationDto[]>('/war-declarations/batch', {
      method: 'POST',
      body: JSON.stringify(dto),
    })
  },

  async update(
    id: string,
    dto: UpdateWarDeclarationInput,
  ): Promise<WarDeclarationDto> {
    return requestJson<WarDeclarationDto>(
      `/war-declarations/${encodeURIComponent(id)}`,
      {
        method: 'PUT',
        body: JSON.stringify(dto),
      },
    )
  },

  async remove(id: string): Promise<void> {
    await requestJson<void>(`/war-declarations/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    })
  },
}

export function formatWarDeclarationDate(item: {
  declaredEra?: string | null
  declaredYear?: number | null
  declaredMonth?: number | null
  declaredDay?: number | null
  declaredPrecision?: string | null
}): string {
  if (item.declaredYear == null) return '시점 미상'
  const yearLabel =
    item.declaredEra === 'BC'
      ? `BC ${item.declaredYear}`
      : `${item.declaredYear}`
  if (item.declaredPrecision === 'year' || item.declaredMonth == null) {
    return item.declaredEra === 'BC' ? yearLabel : `${yearLabel}년`
  }
  const monthPart = String(item.declaredMonth).padStart(2, '0')
  if (item.declaredPrecision === 'month' || item.declaredDay == null) {
    return `${yearLabel}.${monthPart}`
  }
  const dayPart = String(item.declaredDay).padStart(2, '0')
  return `${yearLabel}.${monthPart}.${dayPart}`
}

export function formatWarDeclarationEndDate(item: {
  endedEra?: string | null
  endedYear?: number | null
  endedMonth?: number | null
  endedDay?: number | null
  endedPrecision?: string | null
}): string | null {
  if (item.endedYear == null) return null
  const yearLabel =
    item.endedEra === 'BC' ? `BC ${item.endedYear}` : `${item.endedYear}`
  if (item.endedPrecision === 'year' || item.endedMonth == null) {
    return item.endedEra === 'BC' ? yearLabel : `${yearLabel}년`
  }
  const monthPart = String(item.endedMonth).padStart(2, '0')
  if (item.endedPrecision === 'month' || item.endedDay == null) {
    return `${yearLabel}.${monthPart}`
  }
  return `${yearLabel}.${monthPart}.${String(item.endedDay).padStart(2, '0')}`
}

export function formatWarDeclarationSeveranceDate(item: {
  severanceEra?: string | null
  severanceYear?: number | null
  severanceMonth?: number | null
  severanceDay?: number | null
}): string | null {
  if (item.severanceYear == null) return null
  const yearLabel =
    item.severanceEra === 'BC'
      ? `BC ${item.severanceYear}`
      : `${item.severanceYear}`
  if (item.severanceMonth == null) {
    return item.severanceEra === 'BC' ? yearLabel : `${yearLabel}년`
  }
  const monthPart = String(item.severanceMonth).padStart(2, '0')
  if (item.severanceDay == null) {
    return `${yearLabel}.${monthPart}`
  }
  return `${yearLabel}.${monthPart}.${String(item.severanceDay).padStart(2, '0')}`
}
