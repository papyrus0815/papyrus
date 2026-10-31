/**
 * 과거국가 흐름도용 그래프 알고리즘.
 *
 * - getCountryYearRange: BC를 음수로 변환한 [startYear, endYear] 정규화
 * - topologicalOrder: 사이클이면 입력 순서 + dev 콘솔 경고
 * - getChains: 방향 무시 연결 요소를 위상 정렬 체인으로
 * - getMainPathAndBranchRows: 메인 계보(최장 경로) + 합류 브랜치 행 분리
 */
import type { HistoricalCountryTransitionDto } from '@/shared/api/historical-countries'

interface YearedNode {
  startEra?: string | null
  startYear?: number | null
  endEra?: string | null
  endYear?: number | null
}

/**
 * 국가의 숫자 연도 범위 (BC = 음수).
 * 한쪽 값만 있을 때 — startYear만 있으면 endYear도 startYear로 채워 0폭 카드/필로 표시.
 * (단방향 표기는 표시 컴포넌트가 별도 렌더로 처리)
 */
export function getCountryYearRange(
  node: YearedNode,
): { startYear: number; endYear: number } | null {
  const toNum = (val: number | null | undefined): number | null => {
    if (val == null) return null
    const num = typeof val === 'number' ? val : Number(val)
    return Number.isFinite(num) ? num : null
  }
  const startYear = toNum(node.startYear)
  const endYear = toNum(node.endYear)
  const sy =
    startYear != null
      ? node.startEra === 'BC'
        ? -Math.abs(startYear)
        : Math.abs(startYear)
      : null
  const ey =
    endYear != null
      ? node.endEra === 'BC'
        ? -Math.abs(endYear)
        : Math.abs(endYear)
      : null
  if (sy == null && ey == null) return null
  const resolvedStart = sy ?? ey!
  const resolvedEnd = ey ?? sy!
  return { startYear: resolvedStart, endYear: resolvedEnd }
}

/**
 * 위상 정렬. 사이클이면 dev 콘솔 경고 + 입력 순서 fallback.
 */
export function topologicalOrder(
  nodeIds: string[],
  edges: { predecessorId: string; successorId: string }[],
): string[] {
  const idSet = new Set(nodeIds)
  const inDeg = new Map<string, number>()
  const outEdges = new Map<string, string[]>()
  nodeIds.forEach((id) => {
    inDeg.set(id, 0)
    outEdges.set(id, [])
  })
  edges.forEach(({ predecessorId, successorId }) => {
    if (!idSet.has(predecessorId) || !idSet.has(successorId)) return
    if (predecessorId === successorId) return
    inDeg.set(successorId, (inDeg.get(successorId) ?? 0) + 1)
    outEdges.get(predecessorId)!.push(successorId)
  })
  const queue = nodeIds.filter((id) => inDeg.get(id) === 0)
  const order: string[] = []
  while (queue.length > 0) {
    const currentId = queue.shift()!
    order.push(currentId)
    for (const nextId of outEdges.get(currentId) ?? []) {
      const nextDeg = (inDeg.get(nextId) ?? 0) - 1
      inDeg.set(nextId, nextDeg)
      if (nextDeg === 0) queue.push(nextId)
    }
  }
  if (order.length !== nodeIds.length) {
    if (process.env.NODE_ENV !== 'production') {
      // 사이클 감지 — 사용자에게 잘못된 변천 표시 경고. 입력 순서 fallback이라 화면은 표시되지만 의미상 부정확.
      console.warn(
        '[linked-historical] 변천 그래프에 사이클이 감지됐습니다. 일부 변천 관계가 잘못 등록되었을 수 있습니다.',
        { nodeIds, edges },
      )
    }
    return nodeIds
  }
  return order
}

/**
 * 방향 무시 연결 요소로 묶고, 각 컴포넌트를 위상 정렬해 체인 배열 반환.
 */
export function getChains(
  nodeIds: string[],
  edges: { predecessorId: string; successorId: string }[],
): string[][] {
  const idSet = new Set(nodeIds)
  const adj = new Map<string, string[]>()
  nodeIds.forEach((id) => adj.set(id, []))
  edges.forEach(({ predecessorId, successorId }) => {
    if (!idSet.has(predecessorId) || !idSet.has(successorId)) return
    if (predecessorId === successorId) return
    adj.get(predecessorId)!.push(successorId)
    adj.get(successorId)!.push(predecessorId)
  })
  const visited = new Set<string>()
  const components: string[][] = []
  for (const id of nodeIds) {
    if (visited.has(id)) continue
    const stack = [id]
    const comp: string[] = []
    while (stack.length > 0) {
      const currentId = stack.pop()!
      if (visited.has(currentId)) continue
      visited.add(currentId)
      comp.push(currentId)
      for (const neighborId of adj.get(currentId) ?? []) stack.push(neighborId)
    }
    if (comp.length > 0) {
      const compSet = new Set(comp)
      const edgeSubset = edges.filter(
        (edge) =>
          idSet.has(edge.predecessorId) &&
          idSet.has(edge.successorId) &&
          compSet.has(edge.predecessorId) &&
          compSet.has(edge.successorId),
      )
      components.push(topologicalOrder(comp, edgeSubset))
    }
  }
  return components
}

/**
 * 메인 계보(루트→말단 최장 경로)와 합류 브랜치를 나눔.
 * transitionByEdge가 주어지면 메인 행은 **계승(SUCCESSION)** 변천만으로 구성하고,
 * 멸망(DISSOLVED) 등 다른 유형은 브랜치(위/아래 줄)로 배치.
 * getNodeEndYear가 주어지면, 동일 길이 계보일 때 **가장 최근(endYear 큰) 계보**를 메인으로.
 */
export function getMainPathAndBranchRows(
  chain: string[],
  edges: { predecessorId: string; successorId: string }[],
  transitionByEdge?: Map<string, HistoricalCountryTransitionDto>,
  getNodeEndYear?: (id: string) => number | null,
): string[][] {
  if (chain.length === 0) return []
  const idSet = new Set(chain)
  const inChain = edges.filter(
    (edge) =>
      edge.predecessorId !== edge.successorId &&
      idSet.has(edge.predecessorId) &&
      idSet.has(edge.successorId),
  )
  // 메인 행: 계승(SUCCESSION) 변천만. 없으면 전체 edge 사용
  const inChainForMain = transitionByEdge
    ? inChain.filter((edge) => {
        const transition = transitionByEdge.get(
          `${edge.predecessorId}\t${edge.successorId}`,
        )
        return transition?.eventType === 'SUCCESSION'
      })
    : inChain

  const successors = new Map<string, string[]>()
  chain.forEach((id) => successors.set(id, []))
  inChainForMain.forEach(({ predecessorId, successorId }) => {
    const list = successors.get(predecessorId)!
    if (!list.includes(successorId)) list.push(successorId)
  })
  const rootCandidates = chain.filter(
    (id) => !inChainForMain.some((edge) => edge.successorId === id),
  )
  // 순환 때문에 진입 차수 0인 루트가 하나도 없으면 체인 첫 노드를 후보로 삼는다
  const roots = rootCandidates.length > 0 ? rootCandidates : [chain[0]!]

  // onStack: 현재 경로에 있는 노드. 잘못 등록된 순환 SUCCESSION 데이터에서
  // 무한 재귀(스택 오버플로)로 섹션 전체가 크래시하는 것을 막는다.
  function longestPathFrom(
    id: string,
    onStack: Set<string> = new Set(),
  ): string[] {
    const succs = successors.get(id) ?? []
    if (succs.length === 0) return [id]
    onStack.add(id)
    let best: string[] = [id]
    for (const successor of succs) {
      if (onStack.has(successor)) continue // 사이클 방어: 이미 경로에 있는 노드로는 내려가지 않음
      const sub = longestPathFrom(successor, onStack)
      if (1 + sub.length > best.length) best = [id, ...sub]
    }
    onStack.delete(id)
    return best
  }
  let mainPath: string[] = []
  for (const rootId of roots) {
    const path = longestPathFrom(rootId)
    if (path.length > mainPath.length) {
      mainPath = path
    } else if (
      path.length === mainPath.length &&
      path.length > 0 &&
      getNodeEndYear
    ) {
      const pathEnd = getNodeEndYear(path[path.length - 1]!) ?? -Infinity
      const mainEnd =
        getNodeEndYear(mainPath[mainPath.length - 1]!) ?? -Infinity
      if (pathEnd > mainEnd) mainPath = path
    }
  }
  const mainSet = new Set(mainPath)
  const branches = chain.filter((id) => !mainSet.has(id))
  if (branches.length === 0) return [mainPath]

  const branchSet = new Set(branches)
  const branchSuccessor = new Map<string, string>()
  inChain.forEach((edge) => {
    if (branchSet.has(edge.predecessorId) && branchSet.has(edge.successorId)) {
      branchSuccessor.set(edge.predecessorId, edge.successorId)
    }
  })
  const hasPredecessorInBranches = new Set(branchSuccessor.values())
  const branchRoots = branches.filter(
    (branchId) => !hasPredecessorInBranches.has(branchId),
  )
  const visitedInBranches = new Set<string>()
  const branchRows: string[][] = []

  const buildBranchRow = (startId: string) => {
    const row: string[] = []
    let currentId: string | undefined = startId
    // 사이클이 있는 브랜치(A → B → C → B 등)에서 while 루프가 무한히 돌아
    // RangeError: Invalid array length 를 일으키는 것을 막는다.
    while (currentId && !visitedInBranches.has(currentId)) {
      visitedInBranches.add(currentId)
      row.push(currentId)
      currentId = branchSuccessor.get(currentId)
    }
    if (row.length > 0) {
      branchRows.push(row)
    }
  }

  for (const rootId of branchRoots) {
    buildBranchRow(rootId)
  }
  // 순수 사이클로만 이루어진 브랜치(진입 차수 0인 branchRoot가 없는 경우)도 누락 없이 수거
  for (const branchId of branches) {
    if (!visitedInBranches.has(branchId)) {
      buildBranchRow(branchId)
    }
  }
  return [mainPath, ...branchRows]
}
