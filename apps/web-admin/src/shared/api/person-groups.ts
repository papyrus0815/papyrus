/**
 * 인물 묶음(세대·계파·동기) API
 * 마오·저우언라이 같은 "같은 세대·같은 묶음"을 표현하는 N항 그룹.
 * 1:1 인간관계(person-human-relationships)와 달리 공유 정체성을 갖는 집합.
 */
import { getApiConnection } from './client'
import type { Person } from './person'

export type PersonGroupType =
  | 'GENERATION'
  | 'COHORT'
  | 'FOUNDING'
  | 'FACTION'
  | 'SCHOOL'
  | 'CIRCLE'
  | 'MOVEMENT'
  | 'OTHER'

export type GroupTone =
  | 'amber'
  | 'sky'
  | 'green'
  | 'rose'
  | 'violet'
  | 'indigo'
  | 'teal'
  | 'neutral'

/** tone → 라이트/다크 색상 (배지·칩 공통). 컴포넌트에서 mode로 분기 */
export const GROUP_TONE: Record<
  GroupTone,
  { bgLight: string; bgDark: string; fgLight: string; fgDark: string }
> = {
  amber: { bgLight: 'rgba(245,158,11,0.14)', bgDark: 'rgba(255,214,10,0.18)', fgLight: '#b45309', fgDark: '#ffd60a' },
  sky: { bgLight: 'rgba(14,165,233,0.12)', bgDark: 'rgba(56,189,248,0.18)', fgLight: '#0369a1', fgDark: '#7dd3fc' },
  green: { bgLight: 'rgba(22,163,74,0.12)', bgDark: 'rgba(34,197,94,0.18)', fgLight: '#15803d', fgDark: '#4ade80' },
  rose: { bgLight: 'rgba(225,29,72,0.12)', bgDark: 'rgba(244,63,94,0.18)', fgLight: '#be123c', fgDark: '#fb7185' },
  violet: { bgLight: 'rgba(124,58,237,0.12)', bgDark: 'rgba(167,139,250,0.18)', fgLight: '#6d28d9', fgDark: '#c4b5fd' },
  indigo: { bgLight: 'rgba(99,102,241,0.12)', bgDark: 'rgba(129,140,248,0.18)', fgLight: '#4f46e5', fgDark: '#a5b4fc' },
  teal: { bgLight: 'rgba(13,148,136,0.12)', bgDark: 'rgba(45,212,191,0.18)', fgLight: '#0f766e', fgDark: '#5eead4' },
  neutral: { bgLight: 'rgba(100,116,139,0.12)', bgDark: 'rgba(148,163,184,0.18)', fgLight: '#475569', fgDark: '#cbd5e1' },
}

export const PERSON_GROUP_TYPE_META: Record<
  PersonGroupType,
  { label: string; tone: GroupTone; desc: string; example: string }
> = {
  GENERATION: {
    label: '세대·코호트',
    tone: 'amber',
    desc: '같은 시대를 공유한 무리',
    example: '예: 혁명 1세대, 386세대, 축구 황금세대',
  },
  COHORT: {
    label: '기수·동기',
    tone: 'sky',
    desc: '같은 시기 같은 기관 입직·입학',
    example: '예: 육사 1기, 공채 N기, 입사 동기',
  },
  FOUNDING: {
    label: '창립·창건',
    tone: 'green',
    desc: '함께 세운 사람들',
    example: '예: 건국의 아버지들, 페이팔 마피아',
  },
  FACTION: {
    label: '계파·파벌',
    tone: 'rose',
    desc: '내부 노선 분파',
    example: '예: 하나회, 당내 계파',
  },
  SCHOOL: {
    label: '학파·사조',
    tone: 'violet',
    desc: '사상·양식 계보',
    example: '예: 프랑크푸르트학파, 인상파',
  },
  CIRCLE: {
    label: '동인·사단',
    tone: 'indigo',
    desc: '교유 집단·구심점 주변',
    example: '예: 블룸즈버리, 봉준호 사단, 12사도',
  },
  MOVEMENT: {
    label: '운동·진영',
    tone: 'teal',
    desc: '대의 중심 결집',
    example: '예: 독립운동, 민주화운동',
  },
  OTHER: {
    label: '기타',
    tone: 'neutral',
    desc: '그 밖의 묶음',
    example: '',
  },
}

export const PERSON_GROUP_TYPE_ORDER: PersonGroupType[] = [
  'GENERATION',
  'COHORT',
  'FOUNDING',
  'FACTION',
  'SCHOOL',
  'CIRCLE',
  'MOVEMENT',
  'OTHER',
]

export interface PersonGroupMember {
  membershipId: string
  roleLabel: string | null
  note: string | null
  sortOrder: number | null
  person: Person
}

/** 계승 네비게이션용 간략 참조 */
export interface PersonGroupRef {
  id: string
  name: string
  type: PersonGroupType
  generationOrder: number | null
}

export interface PersonGroup {
  id: string
  name: string
  type: PersonGroupType
  description: string | null
  generationOrder: number | null
  countryId: string | null
  countryName: string | null
  sortOrder: number | null
  memberCount: number
  /** 요청 계정이 이 묶음을 편집할 수 있는지 (생성자이거나 공유 묶음) */
  canEdit: boolean
  /** 전임(이전) 묶음 — 세대 계승 */
  predecessor: PersonGroupRef | null
  /** 후임(다음) 묶음들 — 보통 0~1개 */
  successors: PersonGroupRef[]
  /** 중심 인물 (구심점) */
  center: Person | null
  members: PersonGroupMember[]
  createdAt: string
  updatedAt: string
}

export interface CreatePersonGroupBody {
  name: string
  type: PersonGroupType
  description?: string | null
  generationOrder?: number | null
  countryId?: string | null
  predecessorGroupId?: string | null
  centerPersonId?: string | null
  sortOrder?: number | null
  memberPersonIds?: string[]
}

export interface UpdatePersonGroupBody {
  name?: string
  type?: PersonGroupType
  description?: string | null
  generationOrder?: number | null
  countryId?: string | null
  predecessorGroupId?: string | null
  centerPersonId?: string | null
  sortOrder?: number | null
}

export interface AddPersonGroupMemberBody {
  personId: string
  roleLabel?: string | null
  note?: string | null
  sortOrder?: number | null
}

export interface UpdatePersonGroupMemberBody {
  roleLabel?: string | null
  note?: string | null
  sortOrder?: number | null
}

async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
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

/** 묶음 목록 (멤버 미포함). type/countryId 필터 */
export function listPersonGroups(filter?: {
  type?: PersonGroupType
  countryId?: string
}): Promise<PersonGroup[]> {
  const params = new URLSearchParams()
  if (filter?.type) params.set('type', filter.type)
  if (filter?.countryId) params.set('countryId', filter.countryId)
  const qs = params.toString()
  return requestJson<PersonGroup[]>(
    `/person-groups${qs ? `?${qs}` : ''}`,
    { method: 'GET' },
  )
}

/** 특정 인물이 속한 묶음들 (동료 멤버 포함) */
export function getPersonGroupsByPerson(
  personId: string,
): Promise<PersonGroup[]> {
  return requestJson<PersonGroup[]>(
    `/person-groups/by-person/${encodeURIComponent(personId)}`,
    { method: 'GET' },
  )
}

/** 묶음 상세 (멤버 인물 카드 포함) */
export function getPersonGroup(groupId: string): Promise<PersonGroup> {
  return requestJson<PersonGroup>(
    `/person-groups/${encodeURIComponent(groupId)}`,
    { method: 'GET' },
  )
}

export function createPersonGroup(
  body: CreatePersonGroupBody,
): Promise<PersonGroup> {
  return requestJson<PersonGroup>(`/person-groups`, {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

export function updatePersonGroup(
  groupId: string,
  body: UpdatePersonGroupBody,
): Promise<PersonGroup> {
  return requestJson<PersonGroup>(
    `/person-groups/${encodeURIComponent(groupId)}`,
    { method: 'PUT', body: JSON.stringify(body) },
  )
}

export function deletePersonGroup(groupId: string): Promise<void> {
  return requestJson<void>(`/person-groups/${encodeURIComponent(groupId)}`, {
    method: 'DELETE',
  })
}

export function addPersonGroupMember(
  groupId: string,
  body: AddPersonGroupMemberBody,
): Promise<PersonGroup> {
  return requestJson<PersonGroup>(
    `/person-groups/${encodeURIComponent(groupId)}/members`,
    { method: 'POST', body: JSON.stringify(body) },
  )
}

export function updatePersonGroupMember(
  groupId: string,
  membershipId: string,
  body: UpdatePersonGroupMemberBody,
): Promise<PersonGroup> {
  return requestJson<PersonGroup>(
    `/person-groups/${encodeURIComponent(groupId)}/members/${encodeURIComponent(membershipId)}`,
    { method: 'PUT', body: JSON.stringify(body) },
  )
}

export function removePersonGroupMember(
  groupId: string,
  membershipId: string,
): Promise<void> {
  return requestJson<void>(
    `/person-groups/${encodeURIComponent(groupId)}/members/${encodeURIComponent(membershipId)}`,
    { method: 'DELETE' },
  )
}
