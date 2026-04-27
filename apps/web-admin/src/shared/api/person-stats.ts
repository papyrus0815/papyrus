/**
 * 인물 능력치(6축) + 성격 태그 — 사용자별 평가 API.
 */
import { getApiConnection } from './client'

export const PERSON_STAT_KEYS = [
  'politics',
  'military',
  'diplomacy',
  'intellect',
  'charisma',
  'administration',
] as const
export type PersonStatKey = (typeof PERSON_STAT_KEYS)[number]

export const PERSON_STAT_META: Record<
  PersonStatKey,
  { label: string; short: string; color: string }
> = {
  politics: { label: '정치', short: 'POL', color: '#6366f1' },
  military: { label: '군사', short: 'MIL', color: '#dc2626' },
  diplomacy: { label: '외교', short: 'DIP', color: '#0891b2' },
  intellect: { label: '학식', short: 'INT', color: '#7c3aed' },
  charisma: { label: '카리스마', short: 'CHA', color: '#f59e0b' },
  administration: { label: '행정', short: 'ADM', color: '#10b981' },
}

export type PersonTrait =
  | 'AMBITIOUS'
  | 'CAUTIOUS'
  | 'IMPULSIVE'
  | 'DELIBERATE'
  | 'COURAGEOUS'
  | 'COWARDLY'
  | 'BRUTAL'
  | 'MERCIFUL'
  | 'GENEROUS'
  | 'GREEDY'
  | 'LOYAL'
  | 'TREACHEROUS'
  | 'PIOUS'
  | 'SECULAR'
  | 'SCHOLARLY'
  | 'CHARISMATIC'
  | 'AUSTERE'
  | 'LIBERTINE'
  | 'JUST'
  | 'VENGEFUL'
  | 'PATIENT'
  | 'HOT_TEMPERED'
  | 'HUMBLE'
  | 'ARROGANT'
  | 'OTHER'

export const PERSON_TRAIT_META: Record<
  PersonTrait,
  { label: string; tone: 'positive' | 'negative' | 'neutral' }
> = {
  AMBITIOUS: { label: '야망가', tone: 'neutral' },
  CAUTIOUS: { label: '신중함', tone: 'positive' },
  IMPULSIVE: { label: '충동적', tone: 'negative' },
  DELIBERATE: { label: '사려깊음', tone: 'positive' },
  COURAGEOUS: { label: '용감함', tone: 'positive' },
  COWARDLY: { label: '비겁함', tone: 'negative' },
  BRUTAL: { label: '잔혹함', tone: 'negative' },
  MERCIFUL: { label: '자비로움', tone: 'positive' },
  GENEROUS: { label: '관대함', tone: 'positive' },
  GREEDY: { label: '탐욕스러움', tone: 'negative' },
  LOYAL: { label: '충성스러움', tone: 'positive' },
  TREACHEROUS: { label: '배신·기만', tone: 'negative' },
  PIOUS: { label: '독실함', tone: 'neutral' },
  SECULAR: { label: '세속적', tone: 'neutral' },
  SCHOLARLY: { label: '학자적', tone: 'positive' },
  CHARISMATIC: { label: '카리스마형', tone: 'positive' },
  AUSTERE: { label: '엄격·금욕', tone: 'neutral' },
  LIBERTINE: { label: '방종', tone: 'negative' },
  JUST: { label: '정의로움', tone: 'positive' },
  VENGEFUL: { label: '복수심', tone: 'negative' },
  PATIENT: { label: '인내·끈기', tone: 'positive' },
  HOT_TEMPERED: { label: '다혈질', tone: 'negative' },
  HUMBLE: { label: '겸손', tone: 'positive' },
  ARROGANT: { label: '오만', tone: 'negative' },
  OTHER: { label: '기타', tone: 'neutral' },
}

export const PERSON_TRAIT_ORDER: PersonTrait[] = [
  // 긍정
  'COURAGEOUS',
  'CAUTIOUS',
  'DELIBERATE',
  'MERCIFUL',
  'GENEROUS',
  'LOYAL',
  'JUST',
  'PATIENT',
  'HUMBLE',
  'SCHOLARLY',
  'CHARISMATIC',
  // 중립
  'AMBITIOUS',
  'PIOUS',
  'SECULAR',
  'AUSTERE',
  // 부정
  'IMPULSIVE',
  'COWARDLY',
  'BRUTAL',
  'GREEDY',
  'TREACHEROUS',
  'LIBERTINE',
  'VENGEFUL',
  'HOT_TEMPERED',
  'ARROGANT',
  'OTHER',
]

export interface PersonStats {
  id: string
  personId: string
  accountId: string
  politics: number | null
  military: number | null
  diplomacy: number | null
  intellect: number | null
  charisma: number | null
  administration: number | null
  notes: string | null
  createdAt: string
  updatedAt: string
}

export interface PersonStatsBody {
  politics?: number | null
  military?: number | null
  diplomacy?: number | null
  intellect?: number | null
  charisma?: number | null
  administration?: number | null
  notes?: string | null
}

export interface PersonTraitAssignment {
  id: string
  trait: PersonTrait
  intensity: number | null
  note: string | null
}

export interface PersonTraitItemBody {
  trait: PersonTrait
  intensity?: number | null
  note?: string | null
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

export function getMyStats(personId: string): Promise<PersonStats | null> {
  return requestJson<PersonStats | null>(
    `/persons/${encodeURIComponent(personId)}/my-stats`,
    { method: 'GET' },
  )
}

export function getMyTraits(
  personId: string,
): Promise<PersonTraitAssignment[]> {
  return requestJson<PersonTraitAssignment[]>(
    `/persons/${encodeURIComponent(personId)}/my-traits`,
    { method: 'GET' },
  )
}

// ── 합본 (단일 트랜잭션) ────────────────────────────────────────
/**
 * 능력치 + 성격 태그를 한 트랜잭션으로 저장. 부분 성공 없음.
 * stats / traits 둘 다 옵셔널 — 한쪽만 보내면 그쪽만 갱신.
 */
export interface PersonEvaluationBody {
  stats?: PersonStatsBody
  traits?: { items: PersonTraitItemBody[] }
}

export interface PersonEvaluationResponse {
  stats: PersonStats | null
  traits: PersonTraitAssignment[]
}

export function upsertMyEvaluation(
  personId: string,
  body: PersonEvaluationBody,
): Promise<PersonEvaluationResponse> {
  return requestJson<PersonEvaluationResponse>(
    `/persons/${encodeURIComponent(personId)}/my-evaluation`,
    { method: 'PUT', body: JSON.stringify(body) },
  )
}

export function deleteMyEvaluation(personId: string): Promise<void> {
  return requestJson<void>(
    `/persons/${encodeURIComponent(personId)}/my-evaluation`,
    { method: 'DELETE' },
  )
}

/**
 * 사용자 전체 평가 일괄 조회 — 인물 리스트의 평가 indicator·정렬·필터에 사용.
 * N+1 방지 위해 한 번 호출로 모든 stats + traits 가져옴.
 */
export interface AllMyEvaluationsResponse {
  stats: PersonStats[]
  traits: Array<PersonTraitAssignment & { personId?: string; accountId?: string }>
}

export function getAllMyEvaluations(): Promise<AllMyEvaluationsResponse> {
  return requestJson<AllMyEvaluationsResponse>(
    `/persons/my-evaluations`,
    { method: 'GET' },
  )
}
