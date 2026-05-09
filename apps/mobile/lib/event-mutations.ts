import { api } from './api'
import type { EventDetail, EventListItem } from './dto'

/**
 * 사건 폼 데이터.
 * 날짜는 ISO 문자열 (yyyy-mm-dd 또는 yyyy-mm-ddT...) — 화면에서 era/year/month/day 입력을 ISO로 직렬화.
 * BC 연도는 음수 ISO (예: -0100-01-01).
 */
export type EventFormData = {
  title: string
  description: string | null
  background: string | null
  aftermath: string | null
  startDate: string | null
  startDatePrecision: 'year' | 'month' | 'day' | null
  endDate: string | null
  endDatePrecision: 'year' | 'month' | 'day' | null
  location: string | null
  categoryId: string | null
  keywords: string[]
}

export type EventCategory = { id: string; name: string }

export async function createEvent(data: EventFormData): Promise<EventDetail> {
  const res = await api.post<EventDetail>('/events', sanitize(data))
  return res.data
}

export async function updateEvent(id: string, data: EventFormData): Promise<EventDetail> {
  const res = await api.put<EventDetail>(`/events/${id}`, sanitize(data))
  return res.data
}

export async function deleteEvent(id: string): Promise<void> {
  await api.delete(`/events/${id}`)
}

export async function fetchEventCategories(): Promise<EventCategory[]> {
  const res = await api.get<EventCategory[]>('/event-categories')
  return Array.isArray(res.data) ? res.data : []
}

function sanitize(data: EventFormData) {
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(data)) {
    if (v === undefined) continue
    if (v === '' || (typeof v === 'string' && !v.trim())) continue
    if (Array.isArray(v) && v.length === 0) continue
    out[k] = v
  }
  return out
}

export function eventToFormData(e: EventDetail | EventListItem): EventFormData {
  const detail = e as EventDetail
  return {
    title: e.title ?? '',
    description: e.description ?? null,
    background: detail.background ?? null,
    aftermath: detail.aftermath ?? null,
    startDate: e.startDate ?? null,
    startDatePrecision: (e.startDatePrecision as EventFormData['startDatePrecision']) ?? null,
    endDate: e.endDate ?? null,
    endDatePrecision: (e.endDatePrecision as EventFormData['endDatePrecision']) ?? null,
    location: e.location ?? null,
    categoryId: e.categoryId ?? e.category?.id ?? null,
    keywords: e.keywords ?? [],
  }
}

export const EMPTY_EVENT_FORM: EventFormData = {
  title: '',
  description: null,
  background: null,
  aftermath: null,
  startDate: null,
  startDatePrecision: null,
  endDate: null,
  endDatePrecision: null,
  location: null,
  categoryId: null,
  keywords: [],
}

/**
 * era/year/month/day 입력을 ISO yyyy-mm-dd로 직렬화. BC는 음수 연도.
 * year만 있으면 yyyy-01-01 (precision: 'year'). month까지면 yyyy-mm-01 (precision: 'month'). day까지면 yyyy-mm-dd (precision: 'day').
 * year 없거나 NaN이면 null 반환.
 */
export function dateToIso(input: { era: 'AD' | 'BC'; year: number; month?: number; day?: number } | null): {
  iso: string | null
  precision: 'year' | 'month' | 'day' | null
} {
  if (!input || !Number.isFinite(input.year)) return { iso: null, precision: null }
  const sign = input.era === 'BC' ? -1 : 1
  const yyyy = String(Math.abs(input.year)).padStart(4, '0')
  const yearStr = `${sign < 0 ? '-' : ''}${yyyy}`
  if (input.month == null || !Number.isFinite(input.month)) {
    return { iso: `${yearStr}-01-01`, precision: 'year' }
  }
  const mm = String(input.month).padStart(2, '0')
  if (input.day == null || !Number.isFinite(input.day)) {
    return { iso: `${yearStr}-${mm}-01`, precision: 'month' }
  }
  const dd = String(input.day).padStart(2, '0')
  return { iso: `${yearStr}-${mm}-${dd}`, precision: 'day' }
}

/** ISO yyyy-mm-dd → era/year/month/day. precision으로 어디까지 입력할지 결정. null 반환 시 빈 입력. */
export function isoToDate(
  iso: string | null,
  precision: 'year' | 'month' | 'day' | null,
): { era: 'AD' | 'BC'; year: number; month?: number; day?: number } | null {
  if (!iso) return null
  const m = iso.match(/^(-?)(\d{1,4})(?:-(\d{2}))?(?:-(\d{2}))?/)
  if (!m) return null
  const sign = m[1] === '-' ? -1 : 1
  const year = Number(m[2])
  if (!Number.isFinite(year)) return null
  const era: 'AD' | 'BC' = sign < 0 ? 'BC' : 'AD'
  const out: { era: 'AD' | 'BC'; year: number; month?: number; day?: number } = { era, year }
  if (precision !== 'year' && m[3]) out.month = Number(m[3])
  if (precision === 'day' && m[4]) out.day = Number(m[4])
  return out
}
