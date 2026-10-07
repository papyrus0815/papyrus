import { functional } from '@papyrus/api-sdk'

import { nestiaApiService } from './api.service'

/**
 * 최상위 사건 조망 — GET /events/:eventId/overview.
 * 하위 사건 전부(주 상위 계보)의 날짜·참여국·인물·진영·수치·기록 상태를 한 번에 받는다.
 */
export type EventOverview = Awaited<ReturnType<typeof functional.events.overview.get>>
export type EventOverviewNode = EventOverview['root']
export type EventOverviewCountry = EventOverviewNode['countries'][number]
export type EventOverviewPerson = EventOverviewNode['persons'][number]

export async function getEventOverview(eventId: string): Promise<EventOverview> {
  return functional.events.overview.get(nestiaApiService.getConnection(), eventId)
}
