/**
 * 묶음 전개 트리 — 하위의 하위까지 한 그루로 세우고, 끌어다 놓기가 무엇을 할지 판정한다(순수 로직).
 *
 * 예전 전개는 직계 하위만 보였다(손자는 그 묶음 상세로 들어가야 보였다). 조망 API가 주 상위 계보 전부를
 * 한 번에 주므로, 여기서 부모 → 자식으로 엮어 '모든 사건'을 한 화면에 세운다.
 */
import { parseDateTokens } from './collection-development.lib'

/** 시작 시점 순(날짜 없는 것은 끝) — detail-network.lib는 API 모듈을 끌고 와 여기선 쓰지 않는다(jest 로드 불가) */
function compareStart(first?: string | null, second?: string | null): number {
  const left = parseDateTokens(first)
  const right = parseDateTokens(second)
  if (!left && !right) return 0
  if (!left) return 1
  if (!right) return -1
  return left.year - right.year || left.month - right.month || left.day - right.day
}

export interface TreeSourceDeployedUnit {
  id: string
  militaryUnitId: string
  name: string
  unitType: string | null
  role: string | null
}

export interface TreeSourceSide {
  id: string
  name: string
  color: string | null
  outcome?: string | null
  outcomeNote?: string | null
  deployedUnits?: ReadonlyArray<TreeSourceDeployedUnit>
}

export interface TreeSourceMetric {
  metricKey: string
  metricName: string
  unit: string | null
  value: number | null
  low: number | null
  high: number | null
  approx: boolean
  atLeast: boolean
  scope: string
  scopeLabel: string | null
}

export interface TreeSource {
  id: string
  title: string
  description?: string | null
  parentEventId: string | null
  startDate?: string | null
  startDatePrecision?: string | null
  endDate?: string | null
  endDatePrecision?: string | null
  domain?: string | null
  location?: string | null
  /** 응답에 종류가 실려 오면 그것이 정본. 없으면 하위가 있는지로 판별(단일은 하위를 가질 수 없다) */
  kind?: 'SINGLE' | 'COLLECTION' | null
  /** 손으로 넣은 상위의 국면 — 비면 날짜로 자동 */
  phaseId?: string | null
  /** 이 묶음의 국면 — 최상위 전개에서도 펼친 묶음 안에 장 머리를 세운다 */
  phases?: ReadonlyArray<import('./event-phase.lib').EventPhase>
  /** 조망 API에서 실려 오는 진영·승패·참전 부대 요약 */
  sides?: ReadonlyArray<TreeSourceSide>
  /** 조망 API에서 실려 오는 핵심 수치 요약 */
  metrics?: ReadonlyArray<TreeSourceMetric>
}

export interface BattleRowSummary {
  outcomeBadge: { label: string; color: string | null; outcome: string } | null
  unitSummary: string | null
  unitNames: string[]
  metricSummary: string | null
  locationLabel: string | null
}

function formatCompactCount(val: number, unit: string | null): string {
  const suffix = unit ?? ''
  if (val >= 10000) {
    const man = val / 10000
    const formatted = man >= 10 ? Math.round(man).toLocaleString('ko-KR') : man.toFixed(1).replace(/\.0$/, '')
    return `${formatted}만${suffix}`
  }
  return `${Math.round(val).toLocaleString('ko-KR')}${suffix}`
}

/**
 * 하위 전투·작전 한 줄의 전황 요약 배지 계산 (승패 · 주력 참전부대 · 핵심 피해 · 장소)
 */
export function summarizeBattleRow(node: TreeSource): BattleRowSummary {
  const sides = node.sides ?? []
  let outcomeBadge: BattleRowSummary['outcomeBadge'] = null
  const victor = sides.find((side) => side.outcome === 'VICTORY')
  const draw = sides.find((side) => side.outcome === 'DRAW')
  const inconclusive = sides.find((side) => side.outcome === 'INCONCLUSIVE')
  if (victor) {
    outcomeBadge = {
      label: victor.outcomeNote ? `${victor.name} 승리 (${victor.outcomeNote})` : `${victor.name} 승리`,
      color: victor.color,
      outcome: 'VICTORY',
    }
  } else if (draw) {
    outcomeBadge = {
      label: draw.outcomeNote || '무승부·교착',
      color: draw.color,
      outcome: 'DRAW',
    }
  } else if (inconclusive) {
    outcomeBadge = {
      label: inconclusive.outcomeNote || '결론 없음',
      color: inconclusive.color,
      outcome: 'INCONCLUSIVE',
    }
  }

  const allUnitNames = new Set<string>()
  const sideUnitParts: string[] = []
  for (const side of sides) {
    const units = side.deployedUnits ?? []
    for (const unitItem of units) {
      if (unitItem.name) allUnitNames.add(unitItem.name)
    }
    if (units.length > 0) {
      const topNames = units.slice(0, 2).map((unitItem) => unitItem.name)
      const extra = units.length > 2 ? ` 외 ${units.length - 2}` : ''
      sideUnitParts.push(`${topNames.join('·')}${extra}`)
    }
  }
  const unitSummary = sideUnitParts.length > 0 ? sideUnitParts.join(' vs ') : null

  const metrics = node.metrics ?? []
  let metricSummary: string | null = null
  if (metrics.length > 0) {
    const priorityKeys = [
      'military.prisoners',
      'military.casualties_total',
      'military.deaths_total',
      'military.killed_in_action',
      'military.personnel',
    ]
    const picked =
      priorityKeys
        .map((key) => metrics.find((metricItem) => metricItem.metricKey === key))
        .find((metricItem) => metricItem !== undefined) ?? metrics[0]
    if (picked) {
      const center =
        picked.value ?? (picked.low != null && picked.high != null ? (picked.low + picked.high) / 2 : (picked.low ?? picked.high))
      if (center != null && center > 0) {
        const prefix = picked.scopeLabel ? `${picked.scopeLabel} ` : ''
        metricSummary = `${prefix}${picked.metricName} ${picked.approx ? '약 ' : ''}${formatCompactCount(center, picked.unit)}`
      }
    }
  }

  return {
    outcomeBadge,
    unitSummary,
    unitNames: [...allUnitNames],
    metricSummary,
    locationLabel: node.location?.trim() || null,
  }
}

export interface TreeNode extends TreeSource {
  children: TreeNode[]
  isCollection: boolean
  /** 이 전개 기준 깊이 — 직계 1 */
  depth: number
}

/**
 * 루트 아래로 엮는다. 부모를 못 찾는 노드(상한에 잘린 계보 등)는 버리지 않고 직계로 올린다 — 사라지느니
 * 자리가 틀린 편이 낫다. 형제는 시작 시점 순.
 * @param kindById 종류를 아는 사건(상세 응답의 직계 등) — 조망 노드에 종류가 없을 때 쓴다
 */
export function buildEventTree(
  rootId: string,
  sources: ReadonlyArray<TreeSource>,
  kindById: ReadonlyMap<string, 'SINGLE' | 'COLLECTION'> = new Map(),
): TreeNode[] {
  const byId = new Map<string, TreeNode>()
  for (const source of sources) {
    if (source.id === rootId) continue
    byId.set(source.id, { ...source, children: [], isCollection: false, depth: 1 })
  }
  const top: TreeNode[] = []
  for (const node of byId.values()) {
    const parent = node.parentEventId ? byId.get(node.parentEventId) : undefined
    if (parent) parent.children.push(node)
    else top.push(node)
  }
  const settle = (nodes: TreeNode[], depth: number) => {
    nodes.sort((left, right) => compareStart(left.startDate, right.startDate))
    for (const node of nodes) {
      node.depth = depth
      const known = node.kind ?? kindById.get(node.id)
      node.isCollection = known ? known === 'COLLECTION' : node.children.length > 0
      settle(node.children, depth + 1)
    }
  }
  settle(top, 1)
  return top
}

/** 노드와 그 아래 전부의 id */
export function subtreeIds(node: TreeNode): Set<string> {
  const ids = new Set<string>([node.id])
  const walk = (current: TreeNode) => {
    for (const child of current.children) {
      ids.add(child.id)
      walk(child)
    }
  }
  walk(node)
  return ids
}

export function indexTree(nodes: ReadonlyArray<TreeNode>): Map<string, TreeNode> {
  const map = new Map<string, TreeNode>()
  const walk = (list: ReadonlyArray<TreeNode>) => {
    for (const node of list) {
      map.set(node.id, node)
      walk(node.children)
    }
  }
  walk(nodes)
  return map
}

export type DropAction =
  /** 그 묶음(또는 루트) 밑으로 옮긴다 */
  | { type: 'move'; parentId: string }
  /** 놓인 개별 사건과 함께 새 묶음으로 — 새 묶음은 놓인 사건의 상위 밑에 선다 */
  | { type: 'group'; withId: string; parentId: string }

/**
 * 끌어다 놓기 판정 — 놓을 수 없으면 null(커서가 '금지'로 바뀐다).
 *  - 자기 자신·자기 하위 위로는 못 놓는다(순환)
 *  - 이미 그 상위 밑이면 아무 일도 없다(null)
 *  - 묶음 위 = 그 밑으로 / 개별 위 = 둘을 새 묶음으로 / 'root' = 이 사건 바로 밑으로
 */
export function dropActionFor(
  dragged: TreeNode,
  target: TreeNode | 'root',
  rootId: string,
): DropAction | null {
  if (target === 'root') {
    return dragged.parentEventId === rootId ? null : { type: 'move', parentId: rootId }
  }
  if (subtreeIds(dragged).has(target.id)) return null
  if (target.isCollection) {
    return dragged.parentEventId === target.id ? null : { type: 'move', parentId: target.id }
  }
  return { type: 'group', withId: target.id, parentId: target.parentEventId ?? rootId }
}
