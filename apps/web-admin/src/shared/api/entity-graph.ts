/**
 * 엔티티 연결 그래프 — 어떤 엔티티든 이어진 모든 엔티티(양방향).
 * 설계: docs/entity-graph-design.md · 서버 GET /entity-graph/:kind/:id/connections
 */
import * as connectionsApi from '@api/functional/entity_graph/connections'

import { getApiConnection } from './client'

export type EntityConnections = connectionsApi.getConnections.Output
export type EntityConnectionEdge = EntityConnections['edges'][number]
export type EntityConnectionTarget = EntityConnectionEdge['target']
export type EntityKind = EntityConnectionTarget['kind']
export type ConnectionGroup = EntityConnectionEdge['group']

export function getEntityConnections(
  kind: EntityKind,
  id: string,
): Promise<EntityConnections> {
  return connectionsApi.getConnections(getApiConnection(), kind, id)
}

/** 연결 캐시 키 — 관계를 바꾸는 mutation은 ['entity-connections'] 프리픽스로 무효화 */
export const entityConnectionKeys = {
  all: ['entity-connections'] as const,
  of: (kind: EntityKind, id: string) => ['entity-connections', kind, id] as const,
}
