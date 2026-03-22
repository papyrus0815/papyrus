/**
 * 인물 간 인간관계 API
 * - 유형: MENTOR(스승→제자), GENERAL(일반, 친밀도만)
 */
import { getApiConnection } from './client'

export type PersonHumanRelationshipType = 'MENTOR' | 'GENERAL'

export type MentorPerspective = 'MENTOR' | 'STUDENT' | null

export interface PersonHumanRelationshipBrief {
  id: string
  name: string
  surname: string | null
  nameDisplayOrder: string | null
  birthDate: string | null
  deathDate: string | null
}

export interface PersonHumanRelationshipItem {
  id: string
  relationshipType: PersonHumanRelationshipType
  affinityLevel: number
  startDate: string | null
  endDate: string | null
  note: string | null
  fromPersonId: string
  toPersonId: string
  otherPerson: PersonHumanRelationshipBrief
  mentorPerspective: MentorPerspective
}

export interface CreatePersonHumanRelationshipBody {
  relatedPersonId: string
  relationshipType: PersonHumanRelationshipType
  affinityLevel: number
  startDate?: string
  endDate?: string
  note?: string
  /** MENTOR일 때: true면 경로 인물이 스승, false면 제자 */
  subjectIsMentor?: boolean
}

export interface UpdatePersonHumanRelationshipBody {
  relationshipType?: PersonHumanRelationshipType
  affinityLevel?: number
  startDate?: string | null
  endDate?: string | null
  note?: string | null
  subjectIsMentor?: boolean
}

async function requestJson<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const conn = getApiConnection()
  const base = conn.host.replace(/\/$/, '')
  const url = `${base}${path.startsWith('/') ? path : `/${path}`}`
  const headers = new Headers()
  headers.set('Content-Type', 'application/json')
  if (conn.headers) {
    for (const [k, v] of Object.entries(conn.headers)) {
      if (v != null && v !== '') headers.set(k, String(v))
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

export function getHumanRelationships(
  personId: string,
): Promise<PersonHumanRelationshipItem[]> {
  return requestJson<PersonHumanRelationshipItem[]>(
    `/persons/${encodeURIComponent(personId)}/human-relationships`,
    { method: 'GET' },
  )
}

export function createHumanRelationship(
  personId: string,
  body: CreatePersonHumanRelationshipBody,
): Promise<PersonHumanRelationshipItem> {
  return requestJson<PersonHumanRelationshipItem>(
    `/persons/${encodeURIComponent(personId)}/human-relationships`,
    {
      method: 'POST',
      body: JSON.stringify(body),
    },
  )
}

export function updateHumanRelationship(
  personId: string,
  relationshipId: string,
  body: UpdatePersonHumanRelationshipBody,
): Promise<PersonHumanRelationshipItem> {
  return requestJson<PersonHumanRelationshipItem>(
    `/persons/${encodeURIComponent(personId)}/human-relationships/${encodeURIComponent(relationshipId)}`,
    {
      method: 'PUT',
      body: JSON.stringify(body),
    },
  )
}

export function deleteHumanRelationship(
  personId: string,
  relationshipId: string,
): Promise<void> {
  return requestJson<void>(
    `/persons/${encodeURIComponent(personId)}/human-relationships/${encodeURIComponent(relationshipId)}`,
    { method: 'DELETE' },
  )
}

/** 친밀도 1~5: 부정적(−) ~ 긍정적(+) 스펙트럼 */
export const AFFINITY_SPECTRUM: Record<
  number,
  { short: string; detail: string }
> = {
  1: { short: '−−', detail: '매우 거리감·적대에 가까움' },
  2: { short: '−', detail: '다소 부정적·냉담함' },
  3: { short: '·', detail: '중립' },
  4: { short: '+', detail: '다소 가깝고 우호적' },
  5: { short: '++', detail: '매우 가깝고 신뢰에 가까움' },
}
