/**
 * 엔티티 연결 응답 계약 — GET /entity-graph/:kind/:id/connections
 * 설계: docs/entity-graph-design.md §4·§6
 *
 * - 연도는 전부 부호 연도(BC 음수). 원천의 날짜 체계(구조화/DATETIME)는 서버가 정규화한다.
 * - accessible=false — 소유자 범위 엔티티(인물·사건)를 이 계정이 열 수 없음(칩 비활성).
 */
import type {
  ConnectionGroup,
  EntityKind,
} from '../../domain/entity-graph.types'

export interface EntityConnectionTargetDto {
  kind: EntityKind
  id: string
  label: string
  subtitle: string | null
  imageUrl: string | null
  accessible: boolean
}

export interface EntityConnectionEdgeDto {
  /** 투영 코드 'person.tenure' 등 — 안정 식별자 */
  relation: string
  /** 이 방향에서 읽는 관계 이름(서버 정본) — '재임' / '재임자' */
  relationLabel: string
  group: ConnectionGroup
  direction: 'out' | 'in'
  target: EntityConnectionTargetDto
  /** 서로 다른 역할 앞 2개(+ '외 N') — 같은 대상의 기록이 여러 건이면 합쳐진 값 */
  role: string | null
  /** 가장 이른 시작 ~ 가장 늦은 끝 */
  period: { from: number | null; to: number | null } | null
  /** 합쳐진 원 기록 수(1 이상) */
  count?: number
}

export interface EntityConnectionsResponseDto {
  subject: { kind: EntityKind; id: string; label: string }
  edges: EntityConnectionEdgeDto[]
  /** `${relation}:${'out'|'in'}` → 전체 수. 역방향 상한(60)에 잘렸으면 edges 수보다 크다 */
  totals: Record<string, number>
}
