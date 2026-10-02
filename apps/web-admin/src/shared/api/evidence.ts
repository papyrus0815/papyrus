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
