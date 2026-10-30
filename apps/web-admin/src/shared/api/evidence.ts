/**
 * 근거 API — 출처·인용·지표 카탈로그·측정값 (docs/event-detail-data-foundation.md D3).
 *
 * 숫자는 문자열로 오간다(DECIMAL 자릿수 보존). 측정값 생성은 인용 1개 이상이 필수다.
 */
import { getApiConnection } from './client'

export type StructuredPoint = {
  era: 'BC' | 'AD'
  year: number
  month: number | null
  day: number | null
  precision: 'year' | 'month' | 'day'
}

export type StructuredPointInput = {
  era: 'BC' | 'AD'
  year: number
  month?: number | null
  day?: number | null
}

export type ObservationSubjectType =
  | 'EVENT'
  | 'EVENT_SIDE'
  | 'EVENT_PARTICIPANT'
  | 'COUNTRY'
  | 'HISTORICAL_COUNTRY'
  | 'ORGANIZATION'
  | 'PERSON'

export type MetricValueKind = 'COUNT' | 'MONEY' | 'RATIO' | 'INDEX' | 'MEASURE'
export type MetricAggregation = 'SUM' | 'MAX' | 'LATEST' | 'NONE'

export interface MetricDefinition {
  key: string
  name: string
  domain: string
  valueKind: MetricValueKind
  aggregation: MetricAggregation
  unit: string | null
  definition: string | null
}

export type SourceKind =
  | 'BOOK'
  | 'ARTICLE'
  | 'NEWS'
  | 'OFFICIAL'
  | 'DATASET'
  | 'WEBSITE'
  | 'ARCHIVE'
  | 'LEGACY_UNVERIFIED'
  | 'OTHER'

/** 출처 등급 — 1차(당대 기록)·2차(연구서)·3차(개설·사전) */
export type SourceTier = 'PRIMARY' | 'SECONDARY' | 'TERTIARY'

/** 경합 추정치 중 지위 — 채택·대안·논쟁. null=단일 값이라 따질 것 없음 */
export type EstimateRole = 'PREFERRED' | 'ALTERNATIVE' | 'DISPUTED'

/** 값을 얻은 방식 */
export type EstimateMethod = 'COUNTED' | 'ESTIMATED' | 'EXTRAPOLATED' | 'OFFICIAL_CLAIM'

export interface Source {
  id: string
  kind: SourceKind
  title: string
  authors: string | null
  publisher: string | null
  publishedYear: number | null
  url: string | null
  identifier: string | null
  accessedOn: string | null
  note: string | null
  tier: SourceTier | null
  /** 저술 시점(음수=BC) — 발행연도는 판본 */
  writtenYear: number | null
  /** 관점·입장 한 줄 */
  perspective: string | null
  /** 원문 언어(BCP 47) */
  language: string | null
  originalTitle: string | null
}

export interface Citation {
  id: string
  locator: string | null
  quote: string | null
  note: string | null
  sortOrder: number
  source: Source
}

export interface Observation {
  id: string
  subjectType: ObservationSubjectType
  subjectId: string
  metric: MetricDefinition
  value: string | null
  low: string | null
  high: string | null
  approx: boolean
  atLeast: boolean
  qualifier: string | null
  currency: { code: string; name: string; symbol: string } | null
  start: StructuredPoint | null
  end: StructuredPoint | null
  note: string | null
  sortOrder: number
  estimateRole: EstimateRole | null
  method: EstimateMethod | null
  citations: Citation[]
}

export interface CreateSourceInput {
  kind: SourceKind
  title: string
  authors?: string | null
  publisher?: string | null
  publishedYear?: number | null
  url?: string | null
  identifier?: string | null
  accessedOn?: string | null
  note?: string | null
  tier?: SourceTier | null
  writtenYear?: number | null
  perspective?: string | null
  language?: string | null
  originalTitle?: string | null
}

export type UpdateSourceInput = Partial<CreateSourceInput>

/** 출처 서고 한 줄 */
export interface SourceLibraryEntry extends Source {
  citationCount: number
  eventCount: number
  /** 내가 등록한 출처만 수정 가능 — 시스템 출처는 잠김 */
  editable: boolean
}

/** 출처가 쓰인 곳 — 측정값 한 줄 */
export interface SourceUsage {
  citationId: string
  locator: string | null
  observationId: string
  metricName: string
  value: string | null
  eventId: string | null
  eventTitle: string | null
  subjectType: ObservationSubjectType
  subjectLabel: string | null
}

export interface CitationInput {
  sourceId?: string
  source?: CreateSourceInput
  locator?: string | null
  quote?: string | null
  note?: string | null
}

export interface CreateObservationInput {
  subjectType: ObservationSubjectType
  subjectId: string
  metricKey: string
  value?: string | null
  low?: string | null
  high?: string | null
  approx?: boolean
  atLeast?: boolean
  qualifier?: string | null
  currencyCode?: string | null
  start?: StructuredPointInput | null
  end?: StructuredPointInput | null
  note?: string | null
  estimateRole?: EstimateRole | null
  method?: EstimateMethod | null
  citations: CitationInput[]
}

export type UpdateObservationInput = Partial<Omit<CreateObservationInput, 'subjectType' | 'subjectId' | 'citations'>> & {
  citations?: CitationInput[]
}

/** 서버 에러 본문에서 사람이 읽을 메시지만 꺼낸다 */
async function failure(res: Response): Promise<Error> {
  const text = await res.text()
  try {
    const parsed = JSON.parse(text) as { message?: unknown; error?: { message?: unknown } }
    const message = parsed.error?.message ?? parsed.message
    if (typeof message === 'string') return new Error(message)
    if (Array.isArray(message)) return new Error(message.join(', '))
  } catch {
    /* 본문이 JSON이 아니면 원문 */
  }
  return new Error(text || `요청 실패 (${res.status})`)
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const conn = getApiConnection()
  const res = await fetch(`${conn.host}${path}`, {
    method,
    headers: {
      ...conn.headers,
      ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
    } as HeadersInit,
    body: body !== undefined ? JSON.stringify(body) : undefined,
    credentials: 'include',
  })
  if (!res.ok) throw await failure(res)
  if (res.status === 204) return undefined as T
  const data = (await res.json()) as { data?: T } & T
  return (data?.data ?? data) as T
}

export const listMetricDefinitions = () => request<MetricDefinition[]>('GET', '/metric-definitions')

/** 사건 단위 측정값 — 사건 + 참여국 줄 + 진영 */
export const listEventObservations = (eventId: string) =>
  request<Observation[]>('GET', `/events/${encodeURIComponent(eventId)}/observations`)

export const createObservation = (input: CreateObservationInput) =>
  request<Observation>('POST', '/observations', input)

export const updateObservation = (id: string, input: UpdateObservationInput) =>
  request<Observation>('PATCH', `/observations/${encodeURIComponent(id)}`, input)

export const deleteObservation = (id: string) =>
  request<void>('DELETE', `/observations/${encodeURIComponent(id)}`)

export const searchSources = (query: string) =>
  request<Source[]>('GET', `/sources?q=${encodeURIComponent(query)}&limit=20`)

/** 출처 서고 — tier는 등급 또는 'NONE'(미분류) */
export const listSourceLibrary = (filters: { query?: string; tier?: SourceTier | 'NONE'; kind?: SourceKind } = {}) => {
  const params = new URLSearchParams()
  if (filters.query?.trim()) params.set('q', filters.query.trim())
  if (filters.tier) params.set('tier', filters.tier)
  if (filters.kind) params.set('kind', filters.kind)
  const suffix = params.toString()
  return request<SourceLibraryEntry[]>('GET', `/sources/library${suffix ? `?${suffix}` : ''}`)
}

export const listSourceUsages = (sourceId: string) =>
  request<SourceUsage[]>('GET', `/sources/${encodeURIComponent(sourceId)}/usages`)

export const createSource = (input: CreateSourceInput) => request<Source>('POST', '/sources', input)

export const updateSource = (id: string, input: UpdateSourceInput) =>
  request<Source>('PATCH', `/sources/${encodeURIComponent(id)}`, input)
