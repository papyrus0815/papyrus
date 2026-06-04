/**
 * 인물 간 인간관계 API
 * - 유형: MENTOR(스승→제자), GENERAL(일반, 친밀도만)
 */
import { getApiConnection } from './client'

export type PersonHumanRelationshipType = 'MENTOR' | 'GENERAL'

export type MentorPerspective = 'MENTOR' | 'STUDENT' | null

/**
 * 일반 관계의 시점:
 *  - MUTUAL: 양쪽 합의된 대칭 관계
 *  - SUBJECT: 현재 보고 있는 인물(주체) 시점에서 등록된 관계
 *  - OTHER: 상대 인물이 본인 시점에서 등록 — 주체 페이지에서는 "상대의 시점"으로 표시
 */
export type SubjectivePerspective = 'MUTUAL' | 'SUBJECT' | 'OTHER'

export interface RelationshipSourceItem {
  id: string
  lifeEventId: string
  note: string | null
  lifeEvent: {
    id: string
    personId: string
    title: string
    startDate: string | null
    endDate: string | null
  }
}

/** 인간관계 세분화 태그 */
export type PersonRelationshipTag =
  | 'FRIEND'
  | 'CLOSE_FRIEND'
  | 'LOVER'
  | 'RIVAL'
  | 'ENEMY'
  | 'ALLY'
  | 'COLLEAGUE'
  | 'PATRON'
  | 'CLIENT'
  | 'RELATIVE'
  | 'OTHER'

export const RELATIONSHIP_TAG_META: Record<
  PersonRelationshipTag,
  { label: string; tone: 'positive' | 'negative' | 'neutral' }
> = {
  FRIEND: { label: '친구', tone: 'positive' },
  CLOSE_FRIEND: { label: '절친', tone: 'positive' },
  LOVER: { label: '연인', tone: 'positive' },
  ALLY: { label: '협력자·맹우', tone: 'positive' },
  COLLEAGUE: { label: '동료', tone: 'neutral' },
  PATRON: { label: '후원자', tone: 'positive' },
  CLIENT: { label: '후원받은 자', tone: 'neutral' },
  RELATIVE: { label: '친척', tone: 'neutral' },
  RIVAL: { label: '라이벌', tone: 'negative' },
  ENEMY: { label: '정적·원수', tone: 'negative' },
  OTHER: { label: '기타', tone: 'neutral' },
}

export const RELATIONSHIP_TAG_ORDER: PersonRelationshipTag[] = [
  'FRIEND',
  'CLOSE_FRIEND',
  'LOVER',
  'COLLEAGUE',
  'ALLY',
  'PATRON',
  'CLIENT',
  'RELATIVE',
  'RIVAL',
  'ENEMY',
  'OTHER',
]

export interface PersonHumanRelationshipBrief {
  id: string
  name: string
  surname: string | null
  nameDisplayOrder: string | null
  birthDate: string | null
  deathDate: string | null
  /** 프로필 이미지 URL (없으면 null) — 관계 카드 아바타에 표시 */
  profileImageUrl?: string | null
}

/** 한 관계의 시기별 스냅샷 — affinity·trust·power·formality가 시간에 따라 달라지는 변화 기록. */
export interface RelationshipPhase {
  id: string
  startDate: string | null
  endDate: string | null
  affinityLevel: number | null
  trustLevel: number | null
  powerDynamic: number | null
  formality: number | null
  label: string | null
  note: string | null
}

export interface PersonHumanRelationshipItem {
  id: string
  relationshipType: PersonHumanRelationshipType
  /** 친밀도 -2(매우 적대) ~ +2(매우 우호). null = 기록 없음 */
  affinityLevel: number | null
  /** 신뢰도 -2..+2. null = 기록 없음. 친밀도와 분리되어 "좋아하지만 신뢰는 안 한다"형 표현. */
  trustLevel: number | null
  /** 권력 비대칭 -2(매우 종속) ~ 0(대등) ~ +2(매우 우위). from 인물 기준. null = 해당 없음. */
  powerDynamic: number | null
  /** 격식 -2(매우 친밀·격의없음) ~ +2(매우 격식·예의). null = 기록 없음. */
  formality: number | null
  /** GENERAL · 양쪽 합의된 대칭 관계 여부 */
  isMutual: boolean
  startDate: string | null
  endDate: string | null
  note: string | null
  fromPersonId: string
  toPersonId: string
  otherPerson: PersonHumanRelationshipBrief
  mentorPerspective: MentorPerspective
  subjectivePerspective: SubjectivePerspective
  /** 세분화 태그 — 다중 부착 가능 */
  tags: PersonRelationshipTag[]
  /** 근거 사건 — PersonLifeEvent 다중 연결 */
  sources: RelationshipSourceItem[]
  /** 시기별 스냅샷 — 비어 있으면 단일 본체값(affinityLevel 등)이 전 기간 대표값 */
  phases: RelationshipPhase[]
}

export interface CreatePersonHumanRelationshipBody {
  relatedPersonId: string
  relationshipType: PersonHumanRelationshipType
  /** 친밀도 -2..+2, 생략 또는 null이면 미설정 */
  affinityLevel?: number | null
  trustLevel?: number | null
  powerDynamic?: number | null
  formality?: number | null
  startDate?: string
  endDate?: string
  note?: string
  /** MENTOR일 때: true면 경로 인물이 스승, false면 제자 */
  subjectIsMentor?: boolean
  /** 세분화 태그 — 빈 배열/생략 모두 허용 */
  tags?: PersonRelationshipTag[]
  /** GENERAL 전용 — true면 양쪽 합의된 대칭 관계, false(기본)면 주체 시점 */
  isMutual?: boolean
  /** 근거 사건(연보) ID 목록 */
  sourceLifeEventIds?: string[]
}

export interface UpdatePersonHumanRelationshipBody {
  relationshipType?: PersonHumanRelationshipType
  /** 친밀도 -2..+2, null로 보내면 명시적 초기화 */
  affinityLevel?: number | null
  trustLevel?: number | null
  powerDynamic?: number | null
  formality?: number | null
  startDate?: string | null
  endDate?: string | null
  note?: string | null
  subjectIsMentor?: boolean
  /** 전달 시 전체 교체. 생략 시 변경 없음. */
  tags?: PersonRelationshipTag[]
  /** GENERAL 대칭/비대칭 변경 시 from/to가 다시 정규화됨 */
  isMutual?: boolean
  /** 전달 시 전체 교체. 생략 시 변경 없음. */
  sourceLifeEventIds?: string[]
}

export interface UpsertRelationshipPhaseBody {
  startDate?: string | null
  endDate?: string | null
  affinityLevel?: number | null
  trustLevel?: number | null
  powerDynamic?: number | null
  formality?: number | null
  label?: string | null
  note?: string | null
}

export interface MentorLineageNode {
  person: PersonHumanRelationshipBrief
  direction: 'ANCESTOR' | 'SELF' | 'DESCENDANT'
  depth: number
}

export interface MentorLineageEdge {
  mentorId: string
  studentId: string
}

export interface MentorLineageResponse {
  rootPersonId: string
  nodes: MentorLineageNode[]
  edges: MentorLineageEdge[]
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

export function getMentorLineage(
  personId: string,
): Promise<MentorLineageResponse> {
  return requestJson<MentorLineageResponse>(
    `/persons/${encodeURIComponent(personId)}/mentor-lineage`,
    { method: 'GET' },
  )
}

// ── 시기별 스냅샷(phase) CRUD ────────────────────────────────────────
export function createRelationshipPhase(
  personId: string,
  relationshipId: string,
  body: UpsertRelationshipPhaseBody,
): Promise<RelationshipPhase> {
  return requestJson<RelationshipPhase>(
    `/persons/${encodeURIComponent(personId)}/human-relationships/${encodeURIComponent(relationshipId)}/phases`,
    { method: 'POST', body: JSON.stringify(body) },
  )
}

export function updateRelationshipPhase(
  personId: string,
  relationshipId: string,
  phaseId: string,
  body: UpsertRelationshipPhaseBody,
): Promise<RelationshipPhase> {
  return requestJson<RelationshipPhase>(
    `/persons/${encodeURIComponent(personId)}/human-relationships/${encodeURIComponent(relationshipId)}/phases/${encodeURIComponent(phaseId)}`,
    { method: 'PUT', body: JSON.stringify(body) },
  )
}

export function deleteRelationshipPhase(
  personId: string,
  relationshipId: string,
  phaseId: string,
): Promise<void> {
  return requestJson<void>(
    `/persons/${encodeURIComponent(personId)}/human-relationships/${encodeURIComponent(relationshipId)}/phases/${encodeURIComponent(phaseId)}`,
    { method: 'DELETE' },
  )
}

/** 친밀도 -2..+2 양극 스펙트럼 */
export const AFFINITY_SPECTRUM: Record<
  number,
  { short: string; detail: string; label: string }
> = {
  [-2]: { short: '−−', label: '매우 적대', detail: '매우 거리감·적대에 가까움' },
  [-1]: { short: '−', label: '다소 부정', detail: '다소 부정적·냉담함' },
  [0]: { short: '·', label: '중립', detail: '중립 — 명시적으로 중립을 기록한 상태' },
  [1]: { short: '+', label: '다소 우호', detail: '다소 가깝고 우호적' },
  [2]: { short: '++', label: '매우 우호', detail: '매우 가깝고 신뢰에 가까움' },
}

/** NULL(미설정) 의 별도 메타 — 0(중립)과 시각적으로 구분하기 위함 */
export const AFFINITY_UNKNOWN_META = {
  short: '?',
  label: '기록 없음',
  detail:
    '친밀도가 사료에서 확인되지 않거나 의도적으로 입력하지 않음. 0(중립)과는 다름.',
}

export const AFFINITY_LEVELS = [-2, -1, 0, 1, 2] as const
export type AffinityLevel = (typeof AFFINITY_LEVELS)[number]

/** 추가 차원 (신뢰·권력·격식)의 라벨 매핑 — 친밀도와 동일 -2..+2 */
export const TRUST_SPECTRUM: Record<number, { short: string; label: string }> = {
  [-2]: { short: '−−', label: '매우 불신' },
  [-1]: { short: '−', label: '다소 불신' },
  [0]: { short: '·', label: '중립' },
  [1]: { short: '+', label: '다소 신뢰' },
  [2]: { short: '++', label: '완전 신뢰' },
}

export const POWER_SPECTRUM: Record<number, { short: string; label: string }> = {
  [-2]: { short: '↓↓', label: '매우 종속' },
  [-1]: { short: '↓', label: '다소 종속' },
  [0]: { short: '=', label: '대등' },
  [1]: { short: '↑', label: '다소 우위' },
  [2]: { short: '↑↑', label: '매우 우위' },
}

export const FORMALITY_SPECTRUM: Record<
  number,
  { short: string; label: string }
> = {
  [-2]: { short: '◌◌', label: '매우 친밀(격의없음)' },
  [-1]: { short: '◌', label: '친밀' },
  [0]: { short: '·', label: '중립' },
  [1]: { short: '◯', label: '격식' },
  [2]: { short: '◯◯', label: '매우 격식' },
}

/** 태그-친밀도 충돌 검사 — 비차단 경고 메시지 (없으면 null) */
export function detectAffinityTagConflict(
  affinity: number | null,
  tags: PersonRelationshipTag[],
): string | null {
  if (affinity == null) return null
  // 부정 태그인데 우호 친밀도
  const negativeTags: PersonRelationshipTag[] = ['ENEMY', 'RIVAL']
  const positiveTags: PersonRelationshipTag[] = [
    'FRIEND',
    'CLOSE_FRIEND',
    'LOVER',
    'ALLY',
  ]
  const hasNeg = tags.some((t) => negativeTags.includes(t))
  const hasPos = tags.some((t) => positiveTags.includes(t))
  if (hasNeg && affinity > 0) {
    const negNames = tags
      .filter((t) => negativeTags.includes(t))
      .map((t) => RELATIONSHIP_TAG_META[t].label)
      .join('·')
    return `${negNames} 태그가 있는데 친밀도가 +${affinity} (우호) 입니다 — 의도한 게 맞나요?`
  }
  if (hasPos && affinity < 0) {
    const posNames = tags
      .filter((t) => positiveTags.includes(t))
      .map((t) => RELATIONSHIP_TAG_META[t].label)
      .join('·')
    return `${posNames} 태그가 있는데 친밀도가 ${affinity} (적대) 입니다 — 의도한 게 맞나요?`
  }
  return null
}
