/**
 * 엔티티 연결 그래프 — 참조 규격과 연결(edge) 모양.
 * 설계: docs/entity-graph-design.md
 *
 * kind 철자는 프론트 멘션 type·entity-link-search type과 같다(camelCase) — 세 곳이 같은 말을 하게.
 */

export const ENTITY_KINDS = [
  'person',
  'event',
  'country',
  'historicalCountry',
  'dynasty',
  'organization',
  'treaty',
  'militaryUnit',
  'politicalParty',
  'personGroup',
] as const

export type EntityKind = (typeof ENTITY_KINDS)[number]

export function isEntityKind(value: string): value is EntityKind {
  return (ENTITY_KINDS as readonly string[]).includes(value)
}

/**
 * 화면 묶음 — 연결 패널이 이 단위로 모은다. 순서·아이콘은 프론트가 정한다.
 * polity(국가·정체) · lineage(가문) · office(재임·재위·건국) · event(사건) · family(가족) ·
 * social(인간관계·묶음) · organization(조직·정당) · treaty(조약) · military(군사)
 */
export type ConnectionGroup =
  | 'polity'
  | 'lineage'
  | 'office'
  | 'event'
  | 'family'
  | 'social'
  | 'organization'
  | 'treaty'
  | 'military'

export interface ConnectionTarget {
  kind: EntityKind
  id: string
  label: string
  /** 보조 한 줄 — 생몰·기간·국가 등 */
  subtitle: string | null
  imageUrl: string | null
  /** 소유자 범위 엔티티(인물·사건)에서 이 계정이 열 수 있는가 — false면 칩 비활성 */
  accessible: boolean
}

/** 부호 연도(BC 음수) 구간 — 날짜 체계가 제각각인 원천을 하나로 정규화한 것 */
export interface ConnectionPeriod {
  from: number | null
  to: number | null
}

export interface ConnectionEdge {
  /** 투영 코드 — 'person.tenure' 등. 안정 식별자 */
  relation: string
  /** 이 방향에서 읽는 관계 이름 — 정방향 '재임' / 역방향 '재임자' */
  relationLabel: string
  group: ConnectionGroup
  /** 주어 기준 — out: 주어가 투영의 주어 / in: 주어가 투영의 목적어(역방향) */
  direction: 'out' | 'in'
  target: ConnectionTarget
  /** 참여 역할·직함·관계 유형 등 — 관계를 한 단어 더 구체화 */
  role: string | null
  period: ConnectionPeriod | null
  /** 합쳐진 원 기록 수 — 같은 관계·같은 대상의 재임 15건이면 15 (서비스의 mergeEdges가 채움) */
  count?: number
}

export interface EntityRef {
  kind: EntityKind
  id: string
}

/** 투영 조회 맥락 — 소유자 판정 */
export interface ProjectionContext {
  /** 요청 계정 — 인물·사건 accessible 판정. 없으면 전부 accessible */
  accountId: string | undefined
  /** 역방향 한 투영에서 돌려줄 최대 수(국가의 '국적 인물'처럼 큰 역방향 제어) */
  reverseLimit: number
}

export interface ProjectionResult {
  edges: ConnectionEdge[]
  /** 상한에 잘리기 전 전체 수 — 잘리지 않았으면 edges.length와 같다 */
  total: number
}
