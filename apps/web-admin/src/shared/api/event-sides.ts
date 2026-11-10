/**
 * 사건 진영 API (docs/event-detail-data-foundation.md D1).
 *
 * 진영 자체(이름·색·순서)는 PUT /events/:id/sides, '어느 나라가 어느 편'은 사건 수정의
 * relatedCountries[].sideId로 쓴다 — 같은 사실을 두 곳에 적지 않는다.
 */
import { getApiConnection } from './client'
import type { StructuredPoint } from './evidence'

export type SideLevel = 'COALITION' | 'COUNTRY' | 'FORCE'

/** 이 진영에게 사건이 어떻게 끝났나 */
export type SideOutcome = 'VICTORY' | 'DEFEAT' | 'DRAW' | 'WITHDRAWAL' | 'INCONCLUSIVE'

export interface EventSideMemberCountry {
  participantId: string
  countryId: string | null
  historicalCountryId: string | null
  name: string
  role: string
  participation: string | null
  join: StructuredPoint | null
  joinReason: string | null
  withdraw: StructuredPoint | null
  withdrawReason: string | null
}

export interface EventSide {
  id: string
  name: string
  level: SideLevel | null
  color: string | null
  description: string | null
  parentSideId: string | null
  personGroupId?: string | null
  personGroup?: {
    id: string
    name: string
    type: string
    memberCount: number
  } | null
  sortOrder: number
  outcome: SideOutcome | null
  /** 결과 단서 — '전략적 승리, 전술적 패배' */
  outcomeNote: string | null
  /** 진영별 작전 목표·전략·전술·첩보·보급 대칭 서술 */
  objective?: string | null
  strategy?: string | null
  tactics?: string | null
  intelligence?: string | null
  logistics?: string | null
  participants: EventSideMemberCountry[]
  persons: Array<{ personEventId: string; personId: string; name: string; surname: string | null; role: string | null }>
  organizations: Array<{ relationId: string; organizationId: string; name: string; role: string }>
}

export interface EventSideInput {
  id?: string
  name: string
  level?: SideLevel | null
  color?: string | null
  description?: string | null
  parentSideId?: string | null
  personGroupId?: string | null
  outcome?: SideOutcome | null
  outcomeNote?: string | null
  objective?: string | null
  strategy?: string | null
  tactics?: string | null
  intelligence?: string | null
  logistics?: string | null
}

/** 진영 목록 동기화 — 배열 순서 = 표시 순서. 빠진 진영은 지워지고(그 진영의 측정값도) 소속만 풀린다 */
export async function syncEventSides(eventId: string, sides: EventSideInput[]): Promise<EventSide[]> {
  const conn = getApiConnection()
  const res = await fetch(`${conn.host}/events/${encodeURIComponent(eventId)}/sides`, {
    method: 'PUT',
    headers: { ...conn.headers, 'Content-Type': 'application/json' } as HeadersInit,
    body: JSON.stringify({ sides }),
    credentials: 'include',
  })
  if (!res.ok) {
    const text = await res.text()
    let message = text
    try {
      const parsed = JSON.parse(text) as { message?: unknown; error?: { message?: unknown } }
      const candidate = parsed.error?.message ?? parsed.message
      if (typeof candidate === 'string') message = candidate
    } catch {
      /* 원문 */
    }
    throw new Error(message || `진영 저장 실패 (${res.status})`)
  }
  const data = (await res.json()) as { data?: EventSide[] } & EventSide[]
  return data?.data ?? data
}

/** 진영을 다시 보낼 때 쓰는 입력 형태 — 소속 참여자는 빼고 진영 자체만 */
export function toSideInputs(sides: ReadonlyArray<EventSide>): EventSideInput[] {
  return sides.map((side) => ({
    id: side.id,
    name: side.name,
    level: side.level,
    color: side.color,
    description: side.description,
    parentSideId: side.parentSideId,
    personGroupId: side.personGroupId ?? null,
    outcome: side.outcome,
    outcomeNote: side.outcomeNote,
    objective: side.objective ?? null,
    strategy: side.strategy ?? null,
    tactics: side.tactics ?? null,
    intelligence: side.intelligence ?? null,
    logistics: side.logistics ?? null,
  }))
}

export type SideUnitRole = 'MAIN_EFFORT' | 'SUPPORTING' | 'RESERVE' | 'DEFENSE'

export interface SideUnitLineage {
  id: string
  name: string
  unitType?: string | null
}

export interface SideUnitCommanderView {
  id: string
  name: string
  rank: string | null
  role: string | null
  isOverride: boolean
}

export interface SideUnitMetricView {
  id: string
  metricKey: string
  metricName: string
  unit: string | null
  value: number | null
  low: number | null
  high: number | null
  approx: boolean
  qualifier: string | null
}

export interface SideUnitView {
  id: string
  sideId: string
  parentUnitId: string | null
  commanderId: string | null
  commander: SideUnitCommanderView | null
  role: SideUnitRole | null
  note: string | null
  sortOrder: number
  metrics: SideUnitMetricView[]
  unit: {
    id: string
    name: string
    unitType: string | null
    branch: string | null
    nickname: string | null
    countryId: string | null
    historicalCountryId: string | null
    countryName: string | null
    parents: SideUnitLineage[]
    department: { id: string; name: string; abbreviation: string | null } | null
  }
}

export interface AddSideUnitInput {
  militaryUnitId: string
  parentUnitId?: string | null
  commanderId?: string | null
  role?: SideUnitRole | null
  note?: string | null
}

export interface UpdateSideUnitInput {
  parentUnitId?: string | null
  commanderId?: string | null
  role?: SideUnitRole | null
  note?: string | null
  sortOrder?: number
}

async function parseSideUnitResponse(res: Response, fallbackMessage: string): Promise<SideUnitView[]> {
  if (!res.ok) {
    const text = await res.text()
    let message = text
    try {
      const parsed = JSON.parse(text) as { message?: unknown; error?: { message?: unknown } }
      const candidate = parsed.error?.message ?? parsed.message
      if (typeof candidate === 'string') message = candidate
    } catch {
      /* 원문 */
    }
    throw new Error(message || `${fallbackMessage} (${res.status})`)
  }
  const data = (await res.json()) as { data?: SideUnitView[] } & SideUnitView[]
  return data?.data ?? data
}

/** 사건의 진영별 투입 부대(전투서열 ORBAT) 전체 조회 */
export async function listEventSideUnits(eventId: string): Promise<SideUnitView[]> {
  const conn = getApiConnection()
  const res = await fetch(`${conn.host}/events/${encodeURIComponent(eventId)}/side-units`, {
    method: 'GET',
    headers: conn.headers as HeadersInit,
    credentials: 'include',
  })
  return parseSideUnitResponse(res, '투입 부대 목록을 불러오지 못했습니다')
}

/** 진영에 군사 부대 투입 */
export async function addEventSideUnit(
  eventId: string,
  sideId: string,
  body: AddSideUnitInput,
): Promise<SideUnitView[]> {
  const conn = getApiConnection()
  const res = await fetch(
    `${conn.host}/events/${encodeURIComponent(eventId)}/sides/${encodeURIComponent(sideId)}/units`,
    {
      method: 'POST',
      headers: { ...conn.headers, 'Content-Type': 'application/json' } as HeadersInit,
      body: JSON.stringify(body),
      credentials: 'include',
    },
  )
  return parseSideUnitResponse(res, '부대를 투입하지 못했습니다')
}

/** 투입 부대 역할·상급 부대·지휘관·비고 수정 */
export async function updateEventSideUnit(
  eventId: string,
  id: string,
  body: UpdateSideUnitInput,
): Promise<SideUnitView[]> {
  const conn = getApiConnection()
  const res = await fetch(
    `${conn.host}/events/${encodeURIComponent(eventId)}/side-units/${encodeURIComponent(id)}`,
    {
      method: 'PATCH',
      headers: { ...conn.headers, 'Content-Type': 'application/json' } as HeadersInit,
      body: JSON.stringify(body),
      credentials: 'include',
    },
  )
  return parseSideUnitResponse(res, '투입 부대를 수정하지 못했습니다')
}

/** 진영에서 투입 부대 제외 (부대 엔티티 자체는 유지) */
export async function removeEventSideUnit(eventId: string, id: string): Promise<SideUnitView[]> {
  const conn = getApiConnection()
  const res = await fetch(
    `${conn.host}/events/${encodeURIComponent(eventId)}/side-units/${encodeURIComponent(id)}`,
    {
      method: 'DELETE',
      headers: conn.headers as HeadersInit,
      credentials: 'include',
    },
  )
  return parseSideUnitResponse(res, '투입 부대를 제외하지 못했습니다')
}

export type SideWeaponKind = 'WEAPON' | 'GROUND_VEHICLE' | 'AIRCRAFT' | 'NAVAL_VESSEL'

export interface SideWeaponView {
  id: string
  sideId: string
  deployedUnitId: string | null
  deployedUnitName: string | null
  kind: SideWeaponKind
  itemId: string
  name: string
  categoryLabel: string | null
  countryName: string | null
  manufacturerName: string | null
  quantity: number | null
  note: string | null
  sortOrder: number
}

export interface SideWeaponInput {
  kind: SideWeaponKind
  itemId: string
  deployedUnitId?: string | null
  quantity?: number | null
  note?: string | null
}

export interface WeaponCatalogItem {
  id: string
  kind: SideWeaponKind
  name: string
  categoryLabel: string | null
  countryId: string | null
  historicalCountryId: string | null
  countryName: string | null
  manufacturerName: string | null
}

export async function listEventSideWeapons(eventId: string): Promise<Record<string, SideWeaponView[]>> {
  const conn = getApiConnection()
  const res = await fetch(`${conn.host}/events/${encodeURIComponent(eventId)}/side-weapons`, {
    method: 'GET',
    headers: conn.headers as HeadersInit,
    credentials: 'include',
  })
  if (!res.ok) throw new Error(`투입 병기 목록을 불러오지 못했습니다 (${res.status})`)
  const data = (await res.json()) as { data?: Record<string, SideWeaponView[]> } & Record<string, SideWeaponView[]>
  return data?.data ?? data
}

export async function getWeaponCatalog(eventId: string): Promise<WeaponCatalogItem[]> {
  const conn = getApiConnection()
  const res = await fetch(`${conn.host}/events/${encodeURIComponent(eventId)}/weapon-catalog`, {
    method: 'GET',
    headers: conn.headers as HeadersInit,
    credentials: 'include',
  })
  if (!res.ok) throw new Error(`병기 카탈로그를 불러오지 못했습니다 (${res.status})`)
  const data = (await res.json()) as { data?: WeaponCatalogItem[] } & WeaponCatalogItem[]
  return data?.data ?? data
}

export async function syncEventSideWeapons(
  eventId: string,
  sideId: string,
  weapons: SideWeaponInput[],
): Promise<SideWeaponView[]> {
  const conn = getApiConnection()
  const res = await fetch(
    `${conn.host}/events/${encodeURIComponent(eventId)}/sides/${encodeURIComponent(sideId)}/weapons`,
    {
      method: 'PUT',
      headers: { ...conn.headers, 'Content-Type': 'application/json' } as HeadersInit,
      body: JSON.stringify({ weapons }),
      credentials: 'include',
    },
  )
  if (!res.ok) throw new Error(`투입 병기를 저장하지 못했습니다 (${res.status})`)
  const data = (await res.json()) as { data?: SideWeaponView[] } & SideWeaponView[]
  return data?.data ?? data
}
