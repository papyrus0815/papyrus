/**
 * 마인드맵 배치 — 가운데 뿌리, 첫 단 가지를 좌·우로 나눠 균형, 단(깊이)마다 한 열.
 *
 * 왜 직접: 레이아웃 엔진(dagre·elk·d3-hierarchy)이 의존성에 없고, 필요한 것은 '잎 개수로 세로 자리를 나누는
 * 가로 트리' 하나뿐이다. 잎은 차례로 한 줄씩, 부모는 첫 자식과 끝 자식의 가운데.
 *
 * 좌·우 나누기: 첫 단 가지에 side가 정해져 있으면 그대로, 아니면 잎이 적은 쪽에 차례로 얹는다(순서 유지).
 */

export type MindSide = 'left' | 'right' | 'center'

export interface MindTreeNode {
  id: string
  /** 마디 폭(px) — 열 폭은 그 단에서 가장 넓은 마디가 정한다 */
  width: number
  /** 마디 높이(px) — 잎 한 줄의 높이 */
  height: number
  children: MindTreeNode[]
  /** 첫 단 가지만 — 정해 두면 그쪽에 둔다(원인은 왼쪽, 결과는 오른쪽 같은 뜻이 있을 때) */
  side?: 'left' | 'right'
}

export interface MindPosition {
  /** 마디 왼쪽 위 기준(xyflow position) */
  x: number
  y: number
  side: MindSide
  depth: number
}

export interface MindLayoutOptions {
  /** 열 사이 가로 간격 */
  columnGap?: number
  /** 잎 사이 세로 간격 */
  rowGap?: number
}

function leafCount(node: MindTreeNode): number {
  return node.children.length === 0 ? 1 : node.children.reduce((sum, child) => sum + leafCount(child), 0)
}

export function splitSides(children: ReadonlyArray<MindTreeNode>): { left: MindTreeNode[]; right: MindTreeNode[] } {
  const left: MindTreeNode[] = []
  const right: MindTreeNode[] = []
  let leftLeaves = 0
  let rightLeaves = 0
  for (const child of children) {
    if (child.side === 'left') {
      left.push(child)
      leftLeaves += leafCount(child)
    } else if (child.side === 'right') {
      right.push(child)
      rightLeaves += leafCount(child)
    }
  }
  for (const child of children) {
    if (child.side) continue
    /* 같으면 오른쪽 먼저 — 하나뿐인 가지는 오른쪽(읽는 방향) */
    if (rightLeaves <= leftLeaves) {
      right.push(child)
      rightLeaves += leafCount(child)
    } else {
      left.push(child)
      leftLeaves += leafCount(child)
    }
  }
  return { left, right }
}

export function layoutMindmap(root: MindTreeNode, options: MindLayoutOptions = {}): Map<string, MindPosition> {
  const columnGap = options.columnGap ?? 40
  const rowGap = options.rowGap ?? 8
  const positions = new Map<string, MindPosition>()
  const { left, right } = splitSides(root.children)

  /** 한쪽 숲의 단별 열 폭 */
  const columnWidths = (roots: MindTreeNode[]) => {
    const widths: number[] = []
    const visit = (node: MindTreeNode, depth: number) => {
      widths[depth] = Math.max(widths[depth] ?? 0, node.width)
      for (const child of node.children) visit(child, depth + 1)
    }
    for (const node of roots) visit(node, 1)
    return widths
  }

  const placeSide = (roots: MindTreeNode[], side: 'left' | 'right') => {
    if (roots.length === 0) return
    const widths = columnWidths(roots)
    /* 단 d의 열 바깥쪽 끝 x(뿌리 가운데 0 기준) */
    const columnStart: number[] = []
    let cursor = root.width / 2 + columnGap
    for (let depth = 1; depth < widths.length; depth += 1) {
      columnStart[depth] = cursor
      cursor += (widths[depth] ?? 0) + columnGap
    }
    let nextY = 0
    const place = (node: MindTreeNode, depth: number): number => {
      let centerY: number
      if (node.children.length === 0) {
        centerY = nextY + node.height / 2
        nextY += node.height + rowGap
      } else {
        const childCenters = node.children.map((child) => place(child, depth + 1))
        centerY = (childCenters[0] + childCenters[childCenters.length - 1]) / 2
      }
      /* 왼쪽은 열의 오른쪽 끝(뿌리 쪽)에, 오른쪽은 왼쪽 끝(뿌리 쪽)에 붙인다 — 가지 선이 짧고 고르게 */
      const x = side === 'right' ? columnStart[depth] : -columnStart[depth] - node.width
      positions.set(node.id, { x, y: centerY - node.height / 2, side, depth })
      return centerY
    }
    for (const node of roots) place(node, 1)
    /* 이 쪽 전체를 세로 가운데(0)로 */
    const shift = -(nextY - rowGap) / 2
    const visitShift = (node: MindTreeNode) => {
      const position = positions.get(node.id)
      if (position) position.y += shift
      for (const child of node.children) visitShift(child)
    }
    for (const node of roots) visitShift(node)
  }

  placeSide(right, 'right')
  placeSide(left, 'left')
  positions.set(root.id, { x: -root.width / 2, y: -root.height / 2, side: 'center', depth: 0 })
  return positions
}
