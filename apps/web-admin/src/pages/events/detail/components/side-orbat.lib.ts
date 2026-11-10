/**
 * 전투서열(ORBAT, Order of Battle) 계층 트리 빌더.
 *
 * 각 투입 부대(SideUnitView)는 자기 자신의 정보뿐 아니라 `unit.parents`(가까운 상위 → 최상위)와
 * `unit.department`(OKH·스타프카 등 소속 최고사령부/기관)를 함께 들고 온다.
 *
 * 이 모듈은 평면 투입 부대 배열을 받아:
 *  1) 상위 부대가 같은 진영에 직접 투입돼 있으면 그 투입 행과 연결하고,
 *  2) 하위 부대만 투입돼 있더라도 `unit.parents` 사슬을 따라 상위 편제 노드를 자동 복원하여
 *     '최고사령부(기관) → 집단군/전선군 → 야전군/기갑집단 → 군단 → 사단' 계층 트리를 조립한다.
 */
import type { SideUnitMetricView, SideUnitRole, SideUnitView } from '@/shared/api/event-sides'
import { militaryUnitTypeLabelKo } from '@/shared/lib/military-unit-type-label'

export const SIDE_UNIT_ROLE_LABEL: Record<SideUnitRole, string> = {
  MAIN_EFFORT: '주공',
  SUPPORTING: '조공',
  RESERVE: '예비',
  DEFENSE: '수비',
}

export const SIDE_UNIT_ROLE_OPTIONS: Array<{ value: SideUnitRole; label: string }> = [
  { value: 'MAIN_EFFORT', label: '주공 (주력 돌파)' },
  { value: 'SUPPORTING', label: '조공 (측면·지원)' },
  { value: 'RESERVE', label: '예비 (전략·전술 예비)' },
  { value: 'DEFENSE', label: '수비 (방어·경계)' },
]

/** 부대 급수 정렬 우선순위 — 상위 편제가 먼저 오도록 */
const UNIT_TYPE_RANK: Record<string, number> = {
  THEATER: 1,
  ARMY_GROUP: 2,
  FRONT: 2,
  MILITARY_DISTRICT: 3,
  AIR_FLEET: 4,
  FLEET: 4,
  FIELD_ARMY: 5,
  AIR_CORPS: 6,
  CORPS: 6,
  DIVISION: 7,
  WING: 8,
  BRIGADE: 8,
  REGIMENT: 9,
  SQUADRON: 10,
  BATTALION: 10,
  COMPANY: 11,
  PLATOON: 12,
  SQUAD: 13,
  SPECIAL_FORCES: 14,
  DETACHMENT: 15,
  OTHER: 99,
}

export interface OrbatTreeNode {
  unitId: string
  name: string
  unitType: string | null
  unitTypeLabel: string | null
  branch: string | null
  nickname: string | null
  countryName: string | null
  department: { id: string; name: string; abbreviation: string | null } | null
  /** 이 사건 진영에 직접 투입된 줄이면 존재, 하위 부대의 계통으로만 복원된 상위 노드면 null */
  deployed: SideUnitView | null
  children: OrbatTreeNode[]
}

export function buildSideOrbatTree(rows: ReadonlyArray<SideUnitView>): OrbatTreeNode[] {
  if (rows.length === 0) return []

  const nodesById = new Map<string, OrbatTreeNode>()
  const parentIdByUnitId = new Map<string, string | null>()
  const orderByUnitId = new Map<string, number>()

  let seq = 0
  const ensureNode = (init: {
    unitId: string
    name: string
    unitType: string | null
    branch?: string | null
    nickname?: string | null
    countryName?: string | null
    department?: { id: string; name: string; abbreviation: string | null } | null
    deployed?: SideUnitView | null
  }): OrbatTreeNode => {
    const existing = nodesById.get(init.unitId)
    if (existing) {
      if (init.deployed) {
        existing.deployed = init.deployed
        existing.name = init.name
        existing.unitType = init.unitType
        existing.unitTypeLabel = init.unitType ? militaryUnitTypeLabelKo(init.unitType) : null
        existing.branch = init.branch ?? existing.branch
        existing.nickname = init.nickname ?? existing.nickname
        existing.countryName = init.countryName ?? existing.countryName
        existing.department = init.department ?? existing.department
      } else {
        if (!existing.unitType && init.unitType) {
          existing.unitType = init.unitType
          existing.unitTypeLabel = militaryUnitTypeLabelKo(init.unitType)
        }
        if (!existing.department && init.department) {
          existing.department = init.department
        }
      }
      return existing
    }

    const created: OrbatTreeNode = {
      unitId: init.unitId,
      name: init.name,
      unitType: init.unitType,
      unitTypeLabel: init.unitType ? militaryUnitTypeLabelKo(init.unitType) : null,
      branch: init.branch ?? null,
      nickname: init.nickname ?? null,
      countryName: init.countryName ?? null,
      department: init.department ?? null,
      deployed: init.deployed ?? null,
      children: [],
    }
    nodesById.set(init.unitId, created)
    if (!orderByUnitId.has(init.unitId)) {
      orderByUnitId.set(init.unitId, seq++)
    }
    return created
  }

  for (const row of rows) {
    /* parents는 [바로 위, ..., 최상위] 순이므로 뒤집으면 최상위부터 내려오는 사슬이 된다 */
    const ancestorsFromRoot = [...row.unit.parents].reverse()
    let prevUnitId: string | null = null

    for (const anc of ancestorsFromRoot) {
      ensureNode({
        unitId: anc.id,
        name: anc.name,
        unitType: anc.unitType ?? null,
        department: row.unit.department,
      })
      if (!parentIdByUnitId.has(anc.id)) {
        parentIdByUnitId.set(anc.id, prevUnitId)
      }
      prevUnitId = anc.id
    }

    ensureNode({
      unitId: row.unit.id,
      name: row.unit.name,
      unitType: row.unit.unitType,
      branch: row.unit.branch,
      nickname: row.unit.nickname,
      countryName: row.unit.countryName,
      department: row.unit.department,
      deployed: row,
    })
    parentIdByUnitId.set(row.unit.id, prevUnitId)
  }

  const roots: OrbatTreeNode[] = []
  for (const [unitId, node] of nodesById.entries()) {
    const parentId = parentIdByUnitId.get(unitId) ?? null
    if (parentId && parentId !== unitId && nodesById.has(parentId)) {
      const parentNode = nodesById.get(parentId)!
      if (!parentNode.children.some((child) => child.unitId === unitId)) {
        parentNode.children.push(node)
      }
    } else {
      roots.push(node)
    }
  }

  const sortNodes = (list: OrbatTreeNode[]) => {
    list.sort((left, right) => {
      const rankA = left.unitType ? (UNIT_TYPE_RANK[left.unitType] ?? 50) : 50
      const rankB = right.unitType ? (UNIT_TYPE_RANK[right.unitType] ?? 50) : 50
      if (rankA !== rankB) return rankA - rankB
      const sortA = left.deployed?.sortOrder ?? (orderByUnitId.get(left.unitId) ?? 0)
      const sortB = right.deployed?.sortOrder ?? (orderByUnitId.get(right.unitId) ?? 0)
      return sortA - sortB
    })
    for (const item of list) {
      if (item.children.length > 0) sortNodes(item.children)
    }
  }

  sortNodes(roots)
  return roots
}

export function summarizeOrbatByType(
  rows: ReadonlyArray<SideUnitView>,
): Array<{ unitType: string; label: string; count: number }> {
  const counts = new Map<string, number>()
  for (const row of rows) {
    const key = row.unit.unitType ?? 'OTHER'
    counts.set(key, (counts.get(key) ?? 0) + 1)
  }
  return [...counts.entries()]
    .sort((left, right) => (UNIT_TYPE_RANK[left[0]] ?? 50) - (UNIT_TYPE_RANK[right[0]] ?? 50))
    .map(([unitType, count]) => ({
      unitType,
      label: militaryUnitTypeLabelKo(unitType),
      count,
    }))
}

export function formatSideUnitMetric(metric: SideUnitMetricView): string {
  const prefix = metric.approx ? '약 ' : ''
  const unitSuffix = metric.unit ? `${metric.unit}` : ''
  if (metric.value != null) {
    return `${metric.metricName} ${prefix}${metric.value.toLocaleString('ko-KR')}${unitSuffix}`
  }
  if (metric.low != null && metric.high != null) {
    return `${metric.metricName} ${prefix}${metric.low.toLocaleString('ko-KR')}~${metric.high.toLocaleString('ko-KR')}${unitSuffix}`
  }
  if (metric.low != null) {
    return `${metric.metricName} ${prefix}${metric.low.toLocaleString('ko-KR')}${unitSuffix} 이상`
  }
  if (metric.high != null) {
    return `${metric.metricName} ${prefix}${metric.high.toLocaleString('ko-KR')}${unitSuffix} 이하`
  }
  return metric.metricName
}
