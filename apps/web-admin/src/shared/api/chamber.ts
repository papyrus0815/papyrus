/**
 * 의회의 원(院) 카탈로그 — B7, docs/political-party-model-review.md.
 * 정체·선거·정당 의석 측정값이 가리키는 정본. 정원은 원에 붙은 이력(sizes).
 */
import { getApiConnection } from './client'
import type { StructuredDateInput, StructuredPeriodFields } from './political-party'

export type ChamberRole = 'LOWER' | 'UPPER' | 'UNICAMERAL' | 'ADVISORY' | 'OTHER'
export type ChamberComposition = 'ELECTED' | 'APPOINTED' | 'HEREDITARY' | 'INDIRECT' | 'CORPORATIST' | 'MIXED' | 'OTHER'

export const CHAMBER_ROLE_OPTIONS: Array<{ value: ChamberRole; label: string; hint: string }> = [
  { value: 'LOWER', label: '하원', hint: '양원제의 하원 — 서민원·대의원·중의원' },
  { value: 'UPPER', label: '상원', hint: '양원제의 상원 — 귀족원·원로원·참의원' },
  { value: 'UNICAMERAL', label: '단원', hint: '단원제의 유일 원 — 국회' },
  { value: 'ADVISORY', label: '자문 기구', hint: '의결권 없는 기구 — 중추원' },
  { value: 'OTHER', label: '기타', hint: '' },
]

export const CHAMBER_COMPOSITION_OPTIONS: Array<{ value: ChamberComposition; label: string; hint: string }> = [
  { value: 'ELECTED', label: '선출', hint: '직선' },
  { value: 'APPOINTED', label: '임명', hint: '군주·정부가 임명(이탈리아 왕국 원로원)' },
  { value: 'HEREDITARY', label: '세습', hint: '귀족원' },
  { value: 'INDIRECT', label: '간선', hint: '주·지방 의회가 뽑음(독일 연방참의원)' },
  { value: 'CORPORATIST', label: '직능·조합 대표', hint: '파시 및 조합원' },
  { value: 'MIXED', label: '혼합', hint: '' },
  { value: 'OTHER', label: '기타', hint: '' },
]

export function labelChamberRole(role: string | null | undefined): string {
  return CHAMBER_ROLE_OPTIONS.find((option) => option.value === role)?.label ?? role ?? ''
}

export function labelChamberComposition(composition: string | null | undefined): string {
  return CHAMBER_COMPOSITION_OPTIONS.find((option) => option.value === composition)?.label ?? composition ?? ''
}

export type ChamberSizeDto = StructuredPeriodFields & {
  id: string
  chamberId: string
  seats: number
  note?: string | null
  sortOrder: number
}

export type ChamberRef = { id: string; name: string; localName?: string | null }

export type ChamberDto = StructuredPeriodFields & {
  id: string
  name: string
  localName?: string | null
  shortName?: string | null
  role: ChamberRole
  composition?: ChamberComposition | null
  countryId?: string | null
  historicalCountryId?: string | null
  country?: { id: string; name: string } | null
  historicalCountry?: { id: string; name: string } | null
  predecessorId?: string | null
  predecessor?: ChamberRef | null
  successors?: ChamberRef[]
  note?: string | null
  sortOrder: number
  sizes: ChamberSizeDto[]
  _count?: {
    elections?: number
    observations?: number
    tenures?: number
    passedLaws?: number
    ratifiedTreatySignatories?: number
    systemsAsLower?: number
    systemsAsUpper?: number
  }
}

export type ChamberInput = {
  name: string
  localName?: string | null
  shortName?: string | null
  role: ChamberRole
  composition?: ChamberComposition | null
  countryId?: string | null
  historicalCountryId?: string | null
  start?: StructuredDateInput | null
  end?: StructuredDateInput | null
  predecessorId?: string | null
  note?: string | null
}

export type ChamberSizeInput = {
  seats: number
  start?: StructuredDateInput | null
  end?: StructuredDateInput | null
  note?: string | null
}

/** '대의원(Camera dei Deputati)' — 정체 이름 칸 캐시와 같은 모양 */
export function chamberLabel(chamber: { name: string; localName?: string | null }): string {
  return chamber.localName ? `${chamber.name}(${chamber.localName})` : chamber.name
}

/** 그 해의 정원 — 기간이 그 해를 덮는 이력 중 마지막. 기간 없는 이력은 마지막 수단 */
export function chamberSeatsAt(
  sizes: Array<{ seats: number; startEra?: string | null; startYear?: number | null; endEra?: string | null; endYear?: number | null }>,
  signedYear: number | null,
): number | null {
  if (sizes.length === 0) return null
  const signed = (era: string | null | undefined, year: number | null | undefined) =>
    year == null ? null : era === 'BC' ? -year : year
  if (signedYear != null) {
    const covering = sizes.filter((size) => {
      const start = signed(size.startEra, size.startYear)
      const end = signed(size.endEra, size.endYear)
      return (start == null || start <= signedYear) && (end == null || end >= signedYear) && (start != null || end != null)
    })
    if (covering.length > 0) return covering[covering.length - 1].seats
  }
  const undated = sizes.filter((size) => size.startYear == null && size.endYear == null)
  return undated.length > 0 ? undated[undated.length - 1].seats : null
}

async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  const conn = getApiConnection()
  const base = conn.host.replace(/\/$/, '')
  const headers = new Headers()
  headers.set('Content-Type', 'application/json')
  for (const [headerKey, headerValue] of Object.entries(conn.headers ?? {})) {
    if (headerValue != null && headerValue !== '') headers.set(headerKey, String(headerValue))
  }
  const fetchFn = conn.fetch ?? fetch
  const res = await fetchFn(`${base}${path}`, { ...init, headers, credentials: conn.options?.credentials ?? 'include' })
  if (!res.ok) {
    let message = res.statusText
    try {
      const body = await res.text()
      if (body) {
        try {
          const parsed = JSON.parse(body) as { message?: string | string[]; error?: { message?: string } }
          const raw = parsed.error?.message ?? parsed.message
          message = Array.isArray(raw) ? raw.join(' · ') : (raw ?? body)
        } catch {
          message = body
        }
      }
    } catch {
      /* 본문 없음 */
    }
    throw new Error(message)
  }
  if (res.status === 204) return undefined as T
  return res.json() as Promise<T>
}

const enc = encodeURIComponent

export const chamberApi = {
  list: (scope: { countryId?: string | null; historicalCountryId?: string | null; query?: string }) => {
    const search = new URLSearchParams()
    if (scope.historicalCountryId) search.set('historicalCountryId', scope.historicalCountryId)
    else if (scope.countryId) search.set('countryId', scope.countryId)
    if (scope.query?.trim()) search.set('query', scope.query.trim())
    return requestJson<ChamberDto[]>(`/chambers?${search.toString()}`)
  },
  get: (id: string) => requestJson<ChamberDto>(`/chambers/${enc(id)}`),
  create: (body: ChamberInput) => requestJson<ChamberDto>('/chambers', { method: 'POST', body: JSON.stringify(body) }),
  update: (id: string, body: Partial<ChamberInput>) =>
    requestJson<ChamberDto>(`/chambers/${enc(id)}`, { method: 'PATCH', body: JSON.stringify(body) }),
  remove: (id: string) => requestJson<void>(`/chambers/${enc(id)}`, { method: 'DELETE' }),
  createSize: (id: string, body: ChamberSizeInput) =>
    requestJson<ChamberSizeDto>(`/chambers/${enc(id)}/sizes`, { method: 'POST', body: JSON.stringify(body) }),
  updateSize: (id: string, sizeId: string, body: Partial<ChamberSizeInput>) =>
    requestJson<ChamberSizeDto>(`/chambers/${enc(id)}/sizes/${enc(sizeId)}`, { method: 'PATCH', body: JSON.stringify(body) }),
  removeSize: (id: string, sizeId: string) =>
    requestJson<void>(`/chambers/${enc(id)}/sizes/${enc(sizeId)}`, { method: 'DELETE' }),
}

export const chamberKeys = {
  list: (scope: { countryId?: string | null; historicalCountryId?: string | null }) =>
    ['chambers', scope.historicalCountryId ? `h:${scope.historicalCountryId}` : `c:${scope.countryId ?? ''}`] as const,
}
