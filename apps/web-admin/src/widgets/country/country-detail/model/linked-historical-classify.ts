/**
 * 연결된 역사국가를 "표시 목적"의 3버킷으로 분류한다.
 *
 * - `PREDECESSOR`(직계 전신): **가장 최근 국가(앵커)로 이어지는 계보** 위의 노드.
 * - `CONSTITUENT`(구성 정치체): 다른 정치체의 구성원으로 등록됐고(주도국 아님)
 *   전신 계보에는 없는 노드. 예) 신성로마제국 내 바이에른·작센 왕국.
 * - `HERITAGE`(관련·유산): 그 외 — 계보에서 갈라진 병렬 정치체, 무연결 광역·고대 조상.
 *
 * ## 왜 필요한가 (검토서 R2·R3)
 * 브리지(`historical_country_modern_country`)는 관계타입 없는 순수 M:N이라
 * "직계 전신 / 당대 구성국 / 느슨한 고대조상"을 한 축에 뭉갠다. 독일은 47개가
 * 평면 덤프로 나와 "역사국가가 불필요하게 많다"는 체감을 만든다. 구분 신호는
 * 이미 `transition`·`membership` 테이블에 정규화돼 있으므로, 여기서 이를 읽어
 * "표시용" 분류를 파생한다.
 *
 * ## 왜 "앵커로의 계보"인가 (실데이터 검증 결과)
 * 순진하게 "전체 transition 최장 경로"를 트렁크로 잡으면, transition 데이터가
 * 희소한 국가(프랑스: 3건)에서 우연히 사슬을 이룬 로마 조상(로마공화국→로마제국→
 * 서로마)이 트렁크로 뽑히고 정작 프랑스 실제 계보가 전부 유산으로 밀린다.
 * 대신 **가장 최근 국가(앵커)에서 역방향(전임 방향) 최장 경로**를 트렁크로 쓰면,
 * 계보 신호가 없는 국가는 트렁크가 비어 호출부가 안전하게 flat으로 폴백한다.
 * 앵커는 **진행 중(종료연도 미상)인 현행 국가**를 우선한다 — 종료연도만 늦은 곁가지
 * (예: 대영제국)가 현행 국가를 밀어내 계보가 끊기는 것을 막는다. (실측: 이 규칙으로
 * 독일·영국·러시아·크로아티아·네덜란드 등은 현행국까지 이어진 전신선을 얻고,
 * 계보 데이터가 부족한 프랑스·오스트리아는 안전하게 flat으로 남는다.)
 *
 * ## 불변식 (검토서 R4 — 반드시 지킬 것)
 * 이 분류는 **표시 전용 파생**이다. 브리지 행 집합이나 스코프 합산
 * (`apps/api/.../country-scope.util.ts`의 `resolveLinkedHistoricalCountryIds`)과
 * 무관하며, 어떤 노드도 이 분류 때문에 목록에서 사라지지 않는다(삭제가 아니라
 * 접기·그룹핑만). 분류 결과를 서버 필터로 승격시키지 말 것.
 */

export type LinkedHistoricalKind = 'PREDECESSOR' | 'CONSTITUENT' | 'HERITAGE'

export interface ClassifyTransitionEdge {
  predecessorId: string
  successorId: string
}

export interface ClassifyMembership {
  /** 상위(우산) 정치체 */
  historicalCountryId: string
  /** 구성원 정치체 */
  memberCountryId: string
  /** 구성 정치체 중 주도국(예: 프로이센, 독일 왕국)이면 true — 이들은 전신으로 라우팅 */
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
  /** 앵커(가장 최근 국가)로 이어지는 계보 — [가장 오래된, …, 앵커] 순서. 길이 < 2면 계보 없음. */
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
 * - 앵커 = **진행 중(종료연도 미상)인 노드 우선**, 없으면 종료연도가 가장 늦은 노드.
 *   동률이면 시작연도가 늦은 쪽. 연도 신호가 전무하면 계보 없음([]).
 * - 앵커에서 전임(predecessor) 방향으로 최장 경로를 따라간 뒤 시간순으로 뒤집는다.
 * - 사이클(잘못 등록된 순환 transition)에서도 스택 오버플로 없이 종료한다.
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
  // 진행 중(종료 미상)인 현행 국가를 앵커로 우선한다 — 종료연도만 늦은 곁가지가
  // 현행 국가를 밀어내 계보가 끊기지 않도록. 진행 중 노드가 없으면 종료연도 최댓값.
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

  // 역방향 인접: successor -> [predecessors]
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

  // onStack: 현재 경로에 있는 노드. 순환 데이터에서 무한 재귀를 막는다.
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

  const backward = longestBackFrom(anchor.id) // [anchor, pred, pred2, …]
  const lineage = backward.slice().reverse() // [가장 오래된, …, anchor]
  return lineage.length >= 2 ? lineage : []
}

/**
 * 표시용 3버킷 분류. 순수 함수.
 *
 * @example
 * const { kindById } = classifyLinkedHistorical({ nodes, transitions, memberships })
 * const predecessors = list.filter((item) => kindById.get(item.id) === 'PREDECESSOR')
 */
export function classifyLinkedHistorical(input: ClassifyInput): ClassifyResult {
  const { nodes, transitions, memberships } = input
  const idSet = new Set(nodes.map((node) => node.id))

  const trunk = lineageToAnchor(nodes, transitions)
  const trunkSet = new Set(trunk)

  // 구성국 후보: 이 노드가 (주도국이 아닌) 구성원으로 등록된 경우.
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
