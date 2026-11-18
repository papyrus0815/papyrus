/**
 * 정기 회의·행사 시리즈 (EventSeries) API
 * GET /event-series, GET /event-series/:id, POST /event-series, PATCH /event-series/:id, DELETE /event-series/:id
 */
import type { EventDomainKey } from '@/entities/event/model/event-domain'
import type { EventTypeKey } from '@/entities/event/model/event-type-registry'

import { getApiConnection } from './client'

export type EventSeriesCadenceKind = 'PERIODIC' | 'IRREGULAR'
export type EventSeriesStatus = 'ACTIVE' | 'SUSPENDED' | 'ENDED'
export type EventSeriesNextState = 'AUTO' | 'CONFIRMED' | 'POSTPONED' | 'TBD'

export type EventSeriesForecastKind =
  | 'CONFIRMED'
  | 'SCHEDULED_EVENT'
  | 'ESTIMATED'
  | 'OVERDUE'
  | 'POSTPONED'
  | 'TBD'
  | 'SUSPENDED'
  | 'ENDED'

export interface MissingSeriesEditionRange {
  fromEdition: number
  toEdition: number
  count: number
  isLeadingGap: boolean
}

export interface EventSeriesTimelinePoint {
  id: string
  title: string
  editionBadge: string | null
  seriesEdition: number | null
  startDate: string | null
  hostCountryName: string | null
  hostCountryFlagEmoji: string | null
  isFuture: boolean
}

export interface EventSeriesForecast {
  kind: EventSeriesForecastKind
  cadenceLabel: string
  headline: string
  expectedYear: number | null
  expectedMonth: number | null
  expectedDay: number | null
  expectedEdition: number | null
  scheduledEventId: string | null
  scheduledEventTitle: string | null
  hostCountry: {
    id: string
    name: string
    flagEmoji?: string | null
  } | null
  hostCountryIsEstimated?: boolean
  location: string | null
  note: string | null
  monthsUntil: number | null
  prefill: {
    suggestedTitle: string
    suggestedEdition: number | null
    suggestedYear: number | null
    suggestedMonth: number | null
    suggestedLocation: string | null
    suggestedHostCountryId: string | null
  }
}

export interface EventSeriesEditionSummary {
  id: string
  title: string
  seriesEdition: number | null
  seriesEditionLabel: string | null
  editionBadge: string | null
  startDate: string | null
  startDatePrecision: string | null
  endDate: string | null
  endDatePrecision: string | null
  location: string | null
  kind: 'SINGLE' | 'COLLECTION'
  domain: EventDomainKey
  type: EventTypeKey | null
  hostCountry: {
    id: string
    name: string
    flagEmoji?: string | null
    isHistorical?: boolean
  } | null
  participantCount: number
  isFuture: boolean
}

export interface EventSeriesItem {
  id: string
  title: string
  shortTitle: string | null
  originalTitle: string | null
  description: string | null
  defaultDomain: EventDomainKey
  defaultEventType: EventTypeKey | null
  organizationId: string | null
  organization: {
    id: string
    name: string
    shortName: string | null
    type: string
    logoUrl: string | null
  } | null
  countryId: string | null
  country: { id: string; name: string; flagEmoji?: string | null } | null
  historicalCountryId: string | null
  historicalCountry: { id: string; name: string } | null
  cadenceKind: EventSeriesCadenceKind
  intervalMonths: number | null
  typicalMonth: number | null
  typicalMonthSecondary: number | null
  hostRotationRule: string | null
  hostRotationEnabled: boolean
  hostRotationCountryIds: string[] | null
  status: EventSeriesStatus
  startedEra: 'BC' | 'AD' | null
  startedYear: number | null
  endedEra: 'BC' | 'AD' | null
  endedYear: number | null
  nextScheduleState: EventSeriesNextState
  nextEditionNumber: number | null
  nextYear: number | null
  nextMonth: number | null
  nextDay: number | null
  nextHostCountryId: string | null
  nextHostCountry: { id: string; name: string; flagEmoji?: string | null } | null
  nextLocation: string | null
  nextNote: string | null
  editionCount: number
  latestEdition: EventSeriesEditionSummary | null
  missingRanges?: MissingSeriesEditionRange[]
  forecast: EventSeriesForecast
  createdAt: string
  updatedAt: string
}

export interface EventSeriesDetail extends EventSeriesItem {
  editions: EventSeriesEditionSummary[]
  organizationMemberCount: number
}

export interface EventSeriesContext {
  id: string
  title: string
  shortTitle: string | null
  defaultDomain?: EventDomainKey
  defaultEventType?: EventTypeKey | null
  organizationId: string | null
  organizationName: string | null
  cadenceLabel: string
  editionCount: number
  position: number
  currentEditionBadge: string | null
  prevEdition: {
    id: string
    title: string
    editionBadge: string | null
    startDate: string | null
  } | null
  nextEdition: {
    id: string
    title: string
    editionBadge: string | null
    startDate: string | null
  } | null
  editionsTimeline?: EventSeriesTimelinePoint[]
  missingRanges?: MissingSeriesEditionRange[]
  forecast: EventSeriesForecast
}

export interface EventSeriesListParams {
  organizationId?: string
  countryId?: string
  historicalCountryId?: string
  hostedByCountryId?: string
  status?: EventSeriesStatus
  q?: string
}

export interface CreateEventSeriesBody {
  title: string
  shortTitle?: string | null
  originalTitle?: string | null
  description?: string | null
  defaultDomain?: EventDomainKey
  defaultEventType?: EventTypeKey | null
  organizationId?: string | null
  countryId?: string | null
  historicalCountryId?: string | null
  cadenceKind?: EventSeriesCadenceKind
  intervalMonths?: number | null
  typicalMonth?: number | null
  typicalMonthSecondary?: number | null
  hostRotationRule?: string | null
  hostRotationEnabled?: boolean
  hostRotationCountryIds?: string[] | null
  status?: EventSeriesStatus
  startedEra?: 'BC' | 'AD' | null
  startedYear?: number | null
  endedEra?: 'BC' | 'AD' | null
  endedYear?: number | null
  nextScheduleState?: EventSeriesNextState
  nextEditionNumber?: number | null
  nextYear?: number | null
  nextMonth?: number | null
  nextDay?: number | null
  nextHostCountryId?: string | null
  nextLocation?: string | null
  nextNote?: string | null
}

export type UpdateEventSeriesBody = Partial<CreateEventSeriesBody>

export const CADENCE_PRESETS: ReadonlyArray<{
  label: string
  cadenceKind: EventSeriesCadenceKind
  intervalMonths: number | null
  hint: string
}> = [
  {
    label: '연 2회 (반기마다)',
    cadenceKind: 'PERIODIC',
    intervalMonths: 6,
    hint: '예: 아세안(ASEAN) 정상회의 (상·하반기)',
  },
  {
    label: '매년 (1년 주기)',
    cadenceKind: 'PERIODIC',
    intervalMonths: 12,
    hint: '예: APEC 정상회의, G7·G20 정상회의, 쿼드 정상회의, 유엔 총회',
  },
  {
    label: '2년마다 (격년)',
    cadenceKind: 'PERIODIC',
    intervalMonths: 24,
    hint: '예: ASEM 정상회의, WTO 각료회의',
  },
  {
    label: '3년마다',
    cadenceKind: 'PERIODIC',
    intervalMonths: 36,
    hint: '예: 한·아프리카·중국-아프리카 협력포럼(FOCAC)',
  },
  {
    label: '4년마다',
    cadenceKind: 'PERIODIC',
    intervalMonths: 48,
    hint: '예: 올림픽, 월드컵, 4년 주기 총회',
  },
  {
    label: '5년마다',
    cadenceKind: 'PERIODIC',
    intervalMonths: 60,
    hint: '예: 당대회·5개년 총회',
  },
  {
    label: '부정기·수시 개최',
    cadenceKind: 'IRREGULAR',
    intervalMonths: null,
    hint: '예: 남북정상회담, 미북정상회담, 긴급 특별회의',
  },
]

export const FORECAST_KIND_BADGE: Record<
  EventSeriesForecastKind,
  { label: string; tone: 'blue' | 'emerald' | 'indigo' | 'amber' | 'rose' | 'slate' }
> = {
  CONFIRMED: { label: '차기 일정 확정', tone: 'emerald' },
  SCHEDULED_EVENT: { label: '차기 사건 등록됨', tone: 'emerald' },
  ESTIMATED: { label: '차기 개최 예상', tone: 'indigo' },
  OVERDUE: { label: '예정 시점 경과 · 등록 점검', tone: 'amber' },
  POSTPONED: { label: '차기 연기', tone: 'rose' },
  TBD: { label: '차기 일정 미정', tone: 'slate' },
  SUSPENDED: { label: '시리즈 중단', tone: 'rose' },
  ENDED: { label: '종료된 시리즈', tone: 'slate' },
}

export interface SeriesModalLaunchPayload {
  initialDomain: EventDomainKey
  initialEventType: EventTypeKey | null
  initialCountries: Array<{ countryId: string; role: 'INITIATOR' }>
  initialSeriesPrefill: {
    seriesId: string
    seriesEdition: number | null
    seriesEditionLabel?: string | null
    title: string
    startDate: string | null
    startDatePrecision: 'year' | 'month' | 'day' | null
    location: string | null
    organizationId: string | null
  }
}

function formatSuggestedDate(
  year: number | null,
  month: number | null,
  day: number | null,
): { startDate: string | null; startDatePrecision: 'year' | 'month' | 'day' | null } {
  if (year == null || year <= 0) {
    return { startDate: null, startDatePrecision: null }
  }
  const yyyy = String(year).padStart(4, '0')
  if (month == null || month < 1 || month > 12) {
    return { startDate: `${yyyy}-01-01`, startDatePrecision: 'year' }
  }
  const mm = String(month).padStart(2, '0')
  if (day == null || day < 1 || day > 31) {
    return { startDate: `${yyyy}-${mm}-01`, startDatePrecision: 'month' }
  }
  const dd = String(day).padStart(2, '0')
  return { startDate: `${yyyy}-${mm}-${dd}`, startDatePrecision: 'day' }
}

/**
 * 모달(`EventRegisterModal`)에서 페이지 이탈 없이 곧바로 차기 회차 또는 결번 회차를 등록하기 위한 프리필 생성
 */
export function buildSeriesModalLaunchPayload(
  series: {
    id: string
    title: string
    organizationId?: string | null
    defaultDomain?: EventDomainKey | string | null
    defaultEventType?: EventTypeKey | string | null
    forecast: EventSeriesForecast
  },
  options?: { overrideEdition?: number },
): SeriesModalLaunchPayload {
  const pf = series.forecast.prefill
  const isOverride = options?.overrideEdition != null
  const edition = isOverride
    ? options.overrideEdition!
    : (pf?.suggestedEdition ?? series.forecast.expectedEdition ?? null)
  const title = isOverride
    ? `제${options.overrideEdition}차 ${series.title}`
    : (pf?.suggestedTitle || series.title)
  const dateInfo = isOverride
    ? { startDate: null, startDatePrecision: null }
    : formatSuggestedDate(
        pf?.suggestedYear ?? series.forecast.expectedYear,
        pf?.suggestedMonth ?? series.forecast.expectedMonth,
        series.forecast.expectedDay,
      )
  const hostCountryId = isOverride
    ? null
    : (pf?.suggestedHostCountryId ?? series.forecast.hostCountry?.id ?? null)

  return {
    initialDomain: ((series.defaultDomain as EventDomainKey) || 'DIPLOMACY'),
    initialEventType: ((series.defaultEventType as EventTypeKey | null) ?? 'SUMMIT'),
    initialCountries: hostCountryId
      ? [{ countryId: hostCountryId, role: 'INITIATOR' }]
      : [],
    initialSeriesPrefill: {
      seriesId: series.id,
      seriesEdition: edition,
      title,
      startDate: dateInfo.startDate,
      startDatePrecision: dateInfo.startDatePrecision,
      location: isOverride ? null : (pf?.suggestedLocation ?? series.forecast.location ?? null),
      organizationId: series.organizationId ?? null,
    },
  }
}

/** 차기 회차 원클릭 사건 등록 URL 생성 (`/events/create/?seriesId=...`) */
export function buildCreateNextEditionUrl(series: {
  id: string
  title: string
  organizationId?: string | null
  defaultDomain?: string | null
  defaultEventType?: string | null
  forecast: EventSeriesForecast
}): string {
  const payload = buildSeriesModalLaunchPayload(series)
  const prefill = payload.initialSeriesPrefill
  const sp = new URLSearchParams()
  sp.set('seriesId', prefill.seriesId)
  if (prefill.seriesEdition != null) {
    sp.set('seriesEdition', String(prefill.seriesEdition))
  }
  if (prefill.title) sp.set('title', prefill.title)
  if (prefill.startDate) sp.set('startDate', prefill.startDate)
  if (prefill.startDatePrecision) {
    sp.set('startDatePrecision', prefill.startDatePrecision)
  }
  if (prefill.location) sp.set('location', prefill.location)
  if (payload.initialCountries[0]?.countryId) {
    sp.set('hostCountryId', payload.initialCountries[0].countryId)
  }
  sp.set('domain', payload.initialDomain)
  if (payload.initialEventType) {
    sp.set('type', payload.initialEventType)
  }
  if (prefill.organizationId) {
    sp.set('organizationId', prefill.organizationId)
  }
  return `/events/create/?${sp.toString()}`
}

async function requestSeriesJson<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const conn = getApiConnection()
  const base = conn.host.replace(/\/$/, '')
  const headers = new Headers()
  if (conn.headers) {
    for (const [k, v] of Object.entries(conn.headers)) {
      if (v != null && v !== '') headers.set(k, String(v))
    }
  }
  if (init?.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }
  const fetchFn = conn.fetch ?? fetch
  const res = await fetchFn(`${base}${path}`, {
    credentials: conn.options?.credentials ?? 'include',
    ...init,
    headers,
  })
  if (!res.ok) {
    const raw = await res.text()
    try {
      const parsed = JSON.parse(raw) as { message?: string | string[] }
      const msg = Array.isArray(parsed.message)
        ? parsed.message.join(', ')
        : parsed.message
      if (msg) throw new Error(msg)
    } catch (inner) {
      if (inner instanceof Error && inner.message !== raw) throw inner
    }
    throw new Error(raw || `HTTP ${res.status}`)
  }
  if (res.status === 204) return undefined as T
  return res.json() as Promise<T>
}

export async function listEventSeries(
  params?: EventSeriesListParams,
): Promise<EventSeriesItem[]> {
  const sp = new URLSearchParams()
  if (params?.organizationId) sp.set('organizationId', params.organizationId)
  if (params?.countryId) sp.set('countryId', params.countryId)
  if (params?.historicalCountryId) {
    sp.set('historicalCountryId', params.historicalCountryId)
  }
  if (params?.hostedByCountryId) {
    sp.set('hostedByCountryId', params.hostedByCountryId)
  }
  if (params?.status) sp.set('status', params.status)
  if (params?.q?.trim()) sp.set('q', params.q.trim())
  const qs = sp.toString()
  return requestSeriesJson<EventSeriesItem[]>(
    `/event-series${qs ? `?${qs}` : ''}`,
  )
}

export async function getEventSeriesById(
  id: string,
): Promise<EventSeriesDetail> {
  return requestSeriesJson<EventSeriesDetail>(
    `/event-series/${encodeURIComponent(id)}`,
  )
}

export async function createEventSeries(
  body: CreateEventSeriesBody,
): Promise<EventSeriesDetail> {
  return requestSeriesJson<EventSeriesDetail>('/event-series', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

export async function updateEventSeries(
  id: string,
  body: UpdateEventSeriesBody,
): Promise<EventSeriesDetail> {
  return requestSeriesJson<EventSeriesDetail>(
    `/event-series/${encodeURIComponent(id)}`,
    {
      method: 'PATCH',
      body: JSON.stringify(body),
    },
  )
}

export async function deleteEventSeries(id: string): Promise<void> {
  await requestSeriesJson<void>(`/event-series/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  })
}
