/**
 * 현대 국가에 연결된 역사국가를 "표시 목적"의 3버킷으로 분류한다 (서버 정본).
 *
 * - `PREDECESSOR`(직계 전신): 가장 최근 국가(앵커)로 이어지는 계보 위의 노드.
 * - `CONSTITUENT`(구성 정치체): 다른 정치체의 구성원(주도국 아님)이며 전신 계보에 없는 노드.
 * - `HERITAGE`(관련·유산): 그 외 — 계보에서 갈라진 병렬 정치체, 무연결 광역·고대 조상.
 *
 * 이 분류는 **표시 전용 파생**이다. 브리지 행 집합·스코프 합산(country-scope.util.ts의
 * `resolveLinkedHistoricalCountryIds`)과 무관하며, 어떤 노드도 이 분류 때문에 사라지지
 * 않는다(삭제가 아니라 접기·그룹핑만). 웹의 동명 헬퍼
 * (`apps/web-admin/.../model/linked-historical-classify.ts`)와 동일 알고리즘이며,
 * 정본은 이 서버 파생이 응답 DTO(`linkKind`)로 실어 3면(목록·흐름도·인라인·대시보드)에 상속된다.
 *
 * 앵커 = **진행 중(종료연도 미상)인 현행 국가 우선**, 없으면 종료연도 최댓값. 순진한
 * "전체 최장 경로"는 transition 희소국(프랑스)에서 로마 조상 사슬에 하이재킹되고,
 * "최근 종료 최댓값"만으로는 곁가지(대영제국 1997)가 현행국을 밀어낸다 — 실측 반증.
 */

export type LinkedHistoricalKind = 'PREDECESSOR' | 'CONSTITUENT' | 'HERITAGE'

export interface ClassifyTransitionEdge {
  predecessorId: string
  successorId: string
}

export interface ClassifyMembership {
  historicalCountryId: string
  memberCountryId: string
  isLeadingMember?: boolean | null
}

export interface ClassifyNode {
  id: string
  /** 부호 시작 연도(BC 음수, AD 양수). 미상은 null. */
  startYear: number | null
  /** 부호 종료 연도(BC 음수, AD 양수). 미상은 null. */
  endYear: number | null
}

export interface ClassifyInput {
  nodes: ClassifyNode[]
  transitions: ClassifyTransitionEdge[]
  memberships: ClassifyMembership[]
}

export interface ClassifyResult {
  kindById: Map<string, LinkedHistoricalKind>
  /** 앵커로 이어지는 계보 — [가장 오래된, …, 앵커] 순서. 길이 < 2면 계보 없음. */
  trunk: string[]
}

/** 최근성 키 — 종료연도 우선, 없으면 시작연도. 둘 다 없으면 매우 과거로 취급. */
function recencyKey(node: ClassifyNode): number {
  if (node.endYear != null) return node.endYear
  if (node.startYear != null) return node.startYear
  return Number.NEGATIVE_INFINITY
}

/**
 * 가장 최근 국가(앵커)로 이어지는 전임 계보를 구한다.
 * 사이클(잘못 등록된 순환 transition)에서도 스택 오버플로 없이 종료한다.
 */
export function lineageToAnchor(
  nodes: ClassifyNode[],
  transitions: ClassifyTransitionEdge[],
): string[] {
  if (nodes.length === 0) return []
  const idSet = new Set(nodes.map((node) => node.id))

  const withYears = nodes.filter(
    (node) => node.endYear != null || node.startYear != null,
  )
  if (withYears.length === 0) return []
  const ongoing = withYears.filter((node) => node.endYear == null)
  const candidates = ongoing.length > 0 ? ongoing : withYears
  let anchor = candidates[0]!
  for (const node of candidates) {
    const nodeKey = recencyKey(node)
    const anchorKey = recencyKey(anchor)
    if (
      nodeKey > anchorKey ||
      (nodeKey === anchorKey &&
        (node.startYear ?? -Infinity) > (anchor.startYear ?? -Infinity))
    ) {
      anchor = node
    }
  }

  const predecessorsOf = new Map<string, string[]>()
  nodes.forEach((node) => predecessorsOf.set(node.id, []))
  const seenEdge = new Set<string>()
  for (const edge of transitions) {
    if (!idSet.has(edge.predecessorId) || !idSet.has(edge.successorId)) continue
    if (edge.predecessorId === edge.successorId) continue
    const key = `${edge.successorId}\t${edge.predecessorId}`
    if (seenEdge.has(key)) continue
    seenEdge.add(key)
    predecessorsOf.get(edge.successorId)!.push(edge.predecessorId)
  }

  const onStack = new Set<string>()
  const longestBackFrom = (id: string): string[] => {
    if (onStack.has(id)) return []
    onStack.add(id)
    let chosen: string[] = []
    for (const predecessor of predecessorsOf.get(id) ?? []) {
      const sub = longestBackFrom(predecessor)
      if (sub.length > chosen.length) chosen = sub
    }
    onStack.delete(id)
    return [id, ...chosen]
  }

  const backward = longestBackFrom(anchor.id)
  const lineage = backward.slice().reverse()
  return lineage.length >= 2 ? lineage : []
}

/**
 * 표시용 3버킷 분류. 순수 함수.
 */
export function classifyLinkedHistorical(input: ClassifyInput): ClassifyResult {
  const { nodes, transitions, memberships } = input
  const idSet = new Set(nodes.map((node) => node.id))

  const trunk = lineageToAnchor(nodes, transitions)
  const trunkSet = new Set(trunk)

  const memberIds = new Set<string>()
  for (const membership of memberships) {
    if (!idSet.has(membership.memberCountryId)) continue
    if (membership.isLeadingMember === true) continue
    memberIds.add(membership.memberCountryId)
  }

  const kindById = new Map<string, LinkedHistoricalKind>()
  for (const node of nodes) {
    if (trunkSet.has(node.id)) {
      kindById.set(node.id, 'PREDECESSOR')
    } else if (memberIds.has(node.id)) {
      kindById.set(node.id, 'CONSTITUENT')
    } else {
      kindById.set(node.id, 'HERITAGE')
    }
  }
  return { kindById, trunk }
}
