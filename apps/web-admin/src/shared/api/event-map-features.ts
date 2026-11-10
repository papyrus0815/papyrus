import { getApiConnection } from './client'

export type EventMapGeometryType = 'POINT' | 'ARROW' | 'LINE' | 'POLYGON'

export interface EventMapFeatureView {
  id: string
  eventId: string
  geometryType: EventMapGeometryType
  title: string
  description: string | null
  color: string | null
  sideId: string | null
  sideName: string | null
  sideColor: string | null
  deployedUnitId: string | null
  deployedUnitName: string | null
  coordinates: Array<[number, number]>
  sortOrder: number
}

export interface EventMapFeatureInput {
  geometryType: EventMapGeometryType
  title: string
  description?: string | null
  color?: string | null
  sideId?: string | null
  deployedUnitId?: string | null
  coordinates: Array<[number, number]>
}

export async function listEventMapFeatures(eventId: string): Promise<EventMapFeatureView[]> {
  const conn = getApiConnection()
  const res = await fetch(`${conn.host}/events/${encodeURIComponent(eventId)}/map-features`, {
    method: 'GET',
    headers: conn.headers as HeadersInit,
    credentials: 'include',
  })
  if (!res.ok) throw new Error(`지도 피처를 불러오지 못했습니다 (${res.status})`)
  const data = (await res.json()) as { data?: EventMapFeatureView[] } & EventMapFeatureView[]
  return data?.data ?? data
}

export async function syncEventMapFeatures(
  eventId: string,
  features: EventMapFeatureInput[],
): Promise<EventMapFeatureView[]> {
  const conn = getApiConnection()
  const res = await fetch(`${conn.host}/events/${encodeURIComponent(eventId)}/map-features`, {
    method: 'PUT',
    headers: { ...conn.headers, 'Content-Type': 'application/json' } as HeadersInit,
    body: JSON.stringify({ features }),
    credentials: 'include',
  })
  if (!res.ok) throw new Error(`지도 피처를 저장하지 못했습니다 (${res.status})`)
  const data = (await res.json()) as { data?: EventMapFeatureView[] } & EventMapFeatureView[]
  return data?.data ?? data
}
