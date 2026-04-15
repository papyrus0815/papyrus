/**
 * Cabinet ↔ Event N:M 연결 API
 *
 * Nestia SDK 재생성 전이라 raw fetch + 공용 connection으로 호출.
 * (`getConnection()`이 host와 Bearer 토큰 헤더를 채워줌)
 */
import { nestiaApiService } from './api.service'

export type CabinetEventRole = 'ORIGIN' | 'PARTY' | 'MEDIATOR' | 'AFFECTED'

export const CABINET_EVENT_ROLE_LABELS: Record<CabinetEventRole, string> = {
  ORIGIN: '발단',
  PARTY: '당사자',
  MEDIATOR: '중재자',
  AFFECTED: '영향받음',
}

export interface CabinetEventLink {
  id: string
  cabinetId: string
  eventId: string
  role: CabinetEventRole | null
  note: string | null
  createdAt?: string
  updatedAt?: string
  cabinet?: any
  event?: any
}

function buildHeaders(extra?: Record<string, string>): HeadersInit {
  const conn = nestiaApiService.getConnection()
  const base: Record<string, string> = {}
  const h = (conn.headers ?? {}) as Record<string, string>
  for (const k of Object.keys(h)) {
    const v = h[k]
    if (typeof v === 'string') base[k] = v
  }
  return { 'Content-Type': 'application/json', ...base, ...(extra ?? {}) }
}

function baseUrl(): string {
  return nestiaApiService.getConnection().host.replace(/\/$/, '')
}

async function handle<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`HTTP ${res.status}: ${text || res.statusText}`)
  }
  if (res.status === 204) return undefined as T
  return (await res.json()) as T
}

/** 사건에 연결된 행정부 목록 */
export async function listCabinetsForEvent(eventId: string): Promise<CabinetEventLink[]> {
  const res = await fetch(`${baseUrl()}/events/${encodeURIComponent(eventId)}/cabinets`, {
    method: 'GET',
    headers: buildHeaders(),
    credentials: 'include',
  })
  return handle<CabinetEventLink[]>(res)
}

/** 행정부에 연결된 사건 목록 */
export async function listEventsForCabinet(cabinetId: string): Promise<CabinetEventLink[]> {
  const res = await fetch(
    `${baseUrl()}/government-positions/cabinets/${encodeURIComponent(cabinetId)}/events`,
    { method: 'GET', headers: buildHeaders(), credentials: 'include' },
  )
  return handle<CabinetEventLink[]>(res)
}

/** 사건에 행정부 연결 (있으면 역할/메모 갱신) */
export async function linkCabinetToEvent(
  eventId: string,
  cabinetId: string,
  role?: CabinetEventRole | null,
  note?: string | null,
): Promise<CabinetEventLink> {
  const res = await fetch(`${baseUrl()}/events/${encodeURIComponent(eventId)}/cabinets`, {
    method: 'POST',
    headers: buildHeaders(),
    credentials: 'include',
    body: JSON.stringify({ cabinetId, role: role ?? null, note: note ?? null }),
  })
  return handle<CabinetEventLink>(res)
}

/** 사건-행정부 연결 수정 */
export async function updateCabinetEventLink(
  eventId: string,
  cabinetId: string,
  patch: { role?: CabinetEventRole | null; note?: string | null },
): Promise<CabinetEventLink> {
  const res = await fetch(
    `${baseUrl()}/events/${encodeURIComponent(eventId)}/cabinets/${encodeURIComponent(cabinetId)}`,
    {
      method: 'PATCH',
      headers: buildHeaders(),
      credentials: 'include',
      body: JSON.stringify(patch),
    },
  )
  return handle<CabinetEventLink>(res)
}

/** 사건에서 행정부 연결 해제 */
export async function unlinkCabinetFromEvent(eventId: string, cabinetId: string): Promise<void> {
  const res = await fetch(
    `${baseUrl()}/events/${encodeURIComponent(eventId)}/cabinets/${encodeURIComponent(cabinetId)}`,
    { method: 'DELETE', headers: buildHeaders(), credentials: 'include' },
  )
  await handle<void>(res)
}
