/**
 * 연결 응답 → 화면 묶음. 화면 문법(묶음 순서·정렬·잘린 수)의 단일 출처 — 테스트 대상.
 */
import type {
  ConnectionGroup,
  EntityConnectionEdge,
  EntityConnections,
} from '@/shared/api/entity-graph'

import { CONNECTION_GROUPS } from './entity-kind'

export interface ConnectionSection {
  group: ConnectionGroup
  label: string
  edges: EntityConnectionEdge[]
  /** 서버 상한(역방향 60)에 잘려 화면에 오지 않은 수 — '외 N' */
  omitted: number
}

/** 시작 연도 오름차순, 연도 없는 것은 뒤로, 같으면 이름순 */
function compareEdges(left: EntityConnectionEdge, right: EntityConnectionEdge): number {
  const leftYear = left.period?.from ?? left.period?.to ?? null
  const rightYear = right.period?.from ?? right.period?.to ?? null
  if (leftYear != null && rightYear != null && leftYear !== rightYear) return leftYear - rightYear
  if (leftYear == null && rightYear != null) return 1
  if (leftYear != null && rightYear == null) return -1
  return left.target.label.localeCompare(right.target.label, 'ko')
}

export function buildConnectionSections(data: EntityConnections): ConnectionSection[] {
  // 상한은 역방향에만 걸린다 — 정방향은 서버가 중복(시민권=국적)을 걸러 total보다 적을 수 있어
  // 그 차이를 '잘린 수'로 세면 안 된다
  const shownPerRelation = new Map<string, number>()
  for (const edge of data.edges) {
    if (edge.direction !== 'in') continue
    const key = `${edge.relation}:${edge.direction}`
    shownPerRelation.set(key, (shownPerRelation.get(key) ?? 0) + (edge.count ?? 1))
  }
  const omittedPerGroup = new Map<ConnectionGroup, number>()
  for (const edge of data.edges) {
    const key = `${edge.relation}:${edge.direction}`
    if (!shownPerRelation.has(key)) continue
    const total = data.totals[key] ?? 0
    const shown = shownPerRelation.get(key) ?? 0
    if (total > shown) {
      omittedPerGroup.set(edge.group, (omittedPerGroup.get(edge.group) ?? 0) + (total - shown))
    }
    shownPerRelation.delete(key) // 관계당 한 번만 센다
  }

  return CONNECTION_GROUPS.map(({ id, label }) => ({
    group: id,
    label,
    edges: data.edges.filter((edge) => edge.group === id).sort(compareEdges),
    omitted: omittedPerGroup.get(id) ?? 0,
  })).filter((section) => section.edges.length > 0)
}

/** 부호 연도 구간 → '1885–1916' / '기원전 59–기원전 44' / '1906' */
export function formatConnectionPeriod(period: EntityConnectionEdge['period']): string | null {
  if (!period || (period.from == null && period.to == null)) return null
  const year = (value: number | null) =>
    value == null ? '?' : value < 0 ? `기원전 ${-value}` : `${value}`
  if (period.to == null) return `${year(period.from)}–`
  if (period.from == null || period.from === period.to) return year(period.to)
  return `${year(period.from)}–${year(period.to)}`
}
