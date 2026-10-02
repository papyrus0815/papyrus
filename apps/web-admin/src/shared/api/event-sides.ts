/**
 * 사건 진영 API (docs/event-detail-data-foundation.md D1).
 *
 * 진영 자체(이름·색·순서)는 PUT /events/:id/sides, '어느 나라가 어느 편'은 사건 수정의
 * relatedCountries[].sideId로 쓴다 — 같은 사실을 두 곳에 적지 않는다.
 */
import { getApiConnection } from './client'
import type { StructuredPoint } from './evidence'

export type SideLevel = 'COALITION' | 'COUNTRY' | 'FORCE'

export interface EventSideMemberCountry {
  participantId: string
  countryId: string | null
  historicalCountryId: string | null
  name: string
  role: string
  participation: string | null
  join: StructuredPoint | null
  joinReason: string | null
  withdraw: StructuredPoint | null
  withdrawReason: string | null
}

export interface EventSide {
  id: string
  name: string
  level: SideLevel | null
  color: string | null
  description: string | null
  parentSideId: string | null
  sortOrder: number
  participants: EventSideMemberCountry[]
  persons: Array<{ personEventId: string; personId: string; name: string; surname: string | null; role: string | null }>
  organizations: Array<{ relationId: string; organizationId: string; name: string; role: string }>
}

export interface EventSideInput {
  id?: string
  name: string
  level?: SideLevel | null
  color?: string | null
  description?: string | null
  parentSideId?: string | null
}

/** 진영 목록 동기화 — 배열 순서 = 표시 순서. 빠진 진영은 지워지고(그 진영의 측정값도) 소속만 풀린다 */
export async function syncEventSides(eventId: string, sides: EventSideInput[]): Promise<EventSide[]> {
  const conn = getApiConnection()
  const res = await fetch(`${conn.host}/events/${encodeURIComponent(eventId)}/sides`, {
    method: 'PUT',
    headers: { ...conn.headers, 'Content-Type': 'application/json' } as HeadersInit,
    body: JSON.stringify({ sides }),
    credentials: 'include',
  })
  if (!res.ok) {
    const text = await res.text()
    let message = text
    try {
      const parsed = JSON.parse(text) as { message?: unknown; error?: { message?: unknown } }
      const candidate = parsed.error?.message ?? parsed.message
      if (typeof candidate === 'string') message = candidate
    } catch {
      /* 원문 */
    }
    throw new Error(message || `진영 저장 실패 (${res.status})`)
  }
  const data = (await res.json()) as { data?: EventSide[] } & EventSide[]
  return data?.data ?? data
}

/** 진영을 다시 보낼 때 쓰는 입력 형태 — 소속 참여자는 빼고 진영 자체만 */
export function toSideInputs(sides: ReadonlyArray<EventSide>): EventSideInput[] {
  return sides.map((side) => ({
    id: side.id,
    name: side.name,
    level: side.level,
    color: side.color,
    description: side.description,
    parentSideId: side.parentSideId,
  }))
}
