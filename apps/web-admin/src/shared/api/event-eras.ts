/**
 * 사건의 「시대」 API 래퍼 — 빅토리아 시대, 건륭제 시대.
 *
 * 백엔드: GET /events/eras. 재위(SovereignReign)에서 파생하는 읽기 모델이라
 * 새 테이블·마이그레이션이 없다.
 */
import * as eventsApi from '@api/functional/events'

import { getApiConnection } from './client'

export type EventEra = Awaited<
  ReturnType<typeof eventsApi.eras.getEventEras>
>[number]

function unwrap<T>(response: unknown): T[] {
  const wrapped = response as { data?: T[] } | T[]
  const rows = Array.isArray(wrapped) ? wrapped : (wrapped?.data ?? [])
  return Array.isArray(rows) ? rows : []
}

export async function getEventEras(): Promise<EventEra[]> {
  return unwrap<EventEra>(await eventsApi.eras.getEventEras(getApiConnection()))
}
