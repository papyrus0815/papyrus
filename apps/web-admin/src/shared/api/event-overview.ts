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
export type EventOverviewRelation = EventOverview['relations'][number]

export async function getEventOverview(eventId: string): Promise<EventOverview> {
  return functional.events.overview.get(nestiaApiService.getConnection(), eventId)
}

/** 사건 중심 연결 그래프 — GET /events/:eventId/relation-graph(상위·하위 한 단 + 관련 최대 2단). 상세 › 연관 마인드맵 */
export type EventRelationGraph = Awaited<ReturnType<typeof functional.events.relation_graph.relationGraph>>
export type EventRelationGraphNode = EventRelationGraph['nodes'][number]

export async function getEventRelationGraph(eventId: string, depth = 2): Promise<EventRelationGraph> {
  return functional.events.relation_graph.relationGraph(nestiaApiService.getConnection(), eventId, String(depth))
}
