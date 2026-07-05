/**
 * 가계도 커넥터 레이아웃 기하 — 순수 함수만.
 *
 * fork SVG 바·ChildPair::before 스텁·center-shift가 공유하는 단일 출처.
 * API/렌더 의존이 전혀 없어 단위 테스트가 가능하다(geometry.spec.ts). 렌더 헬퍼(썸네일·
 * 툴팁 등 API 결합)는 utils.ts에 두고, 여기서는 폭·정렬 계산만 담당한다.
 *
 * 핵심 불변식: 자녀 컬럼 폭은 NODE_W 고정이 아니라 손자녀 서브트리로 팽창한 실측값이다.
 * 이 값을 fork·스텁·shift가 모두 공유해야 선이 카드 중심에 정확히 닿는다.
 */
import type { FamilyTreePerson } from '@/shared/api/persons-family-tree'
import {
  ANC_PARENTS_GAP,
  CHILD_GAP,
  DESCENDANT_GAP,
  DESCENDANT_MAX_DEPTH,
  NODE_W,
  SPOUSE_JOIN_SPAN,
} from './constants'
import { ftResolveParentIds } from './family-tree-derive'
import type { ChildPerson, NodePerson } from './types'

export function isLeft(person?: NodePerson | null): boolean {
  const gender = (person?.gender ?? '').toUpperCase()
  return gender === 'MALE' || gender === 'M'
}

export function isRight(person?: NodePerson | null): boolean {
  const gender = (person?.gender ?? '').toUpperCase()
  return gender === 'FEMALE' || gender === 'F'
}

/**
 * ChildPair 안에서 자녀가 좌/우 어느 쪽에 놓이는지 결정.
 *  - 명시 gender 우선: child=M 또는 spouse=F → 자녀 왼쪽
 *  - 그 다음 spouse=M 또는 child=F → 자녀 오른쪽
 *  - 둘 다 미지정 → 기본 왼쪽
 *
 * 동일 휴리스틱이 ChildPair $childOffset 계산과 ForkToChildren 가로 바 끝점 계산
 * 양쪽에서 필요하므로 단일 출처로 추출. 두 곳이 어긋나면 fork 선이 자녀 카드를
 * 벗어나 배우자까지 침범하는 정렬 문제 발생.
 */
export function isChildOnLeftInPair(child: ChildPerson): boolean {
  if (!child.spouse) return true
  if (isLeft(child) || isRight(child.spouse)) return true
  if (isLeft(child.spouse) || isRight(child)) return false
  return true
}

/**
 * 한 후손의 "다음 세대" 노드(깊이·방문 필터 적용) — 폭 계산과 렌더가 공유하는 단일 출처.
 * depth+1이 maxDepth 미만일 때만, visited에 없는 자식을 반환. (visited는 아직 이 후손을
 * 포함하지 않은 상태 — 호출부가 재귀 전에 nextVisited로 이 후손을 추가한다.)
 */
export function nextGenOf(
  descendant: FamilyTreePerson,
  childrenOf: Map<string, FamilyTreePerson[]>,
  depth: number,
  maxDepth: number,
  visited: Set<string>,
): FamilyTreePerson[] {
  if (!(depth + 1 < maxDepth) || !descendant.id) return []
  return (childrenOf.get(descendant.id) ?? []).filter((kid) => !visited.has(kid.id))
}

/**
 * 각 후손 페어의 렌더 폭 배열 = max(NODE_W, 그 아래 서브트리 폭).
 * ForkToCompactChildren의 바 끝점(descendant-subtree.tsx)과 descendantsRowWidth 합산이
 * 동일 배열을 소비해 fork·행 폭이 어긋나지 않게 하는 **단일 출처**.
 */
export function descendantSlotWidths(
  descendants: FamilyTreePerson[],
  childrenOf: Map<string, FamilyTreePerson[]>,
  depth: number,
  maxDepth: number,
  visited: Set<string>,
): number[] {
  return descendants.map((descendant) => {
    const next = nextGenOf(descendant, childrenOf, depth, maxDepth, visited)
    const nextVisited = new Set(visited)
    if (descendant.id) nextVisited.add(descendant.id)
    return Math.max(
      NODE_W,
      descendantsRowWidth(next, childrenOf, depth + 1, maxDepth, nextVisited),
    )
  })
}

/**
 * DescendantSubtree(descendants, depth)가 실제로 렌더하는 가로 폭(px).
 * = 각 슬롯 폭 합 + 사이 gap. 슬롯 폭은 descendantSlotWidths 단일 출처를 재사용.
 */
export function descendantsRowWidth(
  descendants: FamilyTreePerson[],
  childrenOf: Map<string, FamilyTreePerson[]>,
  depth: number,
  maxDepth: number,
  visited: Set<string>,
): number {
  if (descendants.length === 0) return 0
  const widths = descendantSlotWidths(descendants, childrenOf, depth, maxDepth, visited)
  return (
    widths.reduce((sum, width) => sum + width, 0) +
    (descendants.length - 1) * DESCENDANT_GAP
  )
}

/**
 * AncestorColumn(personId, depth)이 실제로 렌더하는 가로 폭(px).
 * = max(NODE_W, fatherW + gap + motherW). descendantsRowWidth의 상향 대칭 버전으로,
 * 부/모 서브트리 폭이 비대칭일 때 flex 균등분할(1 1 0)이 만들던 커넥터 드리프트를 없앤다.
 * ancestor-column.tsx의 showFather/showMother 게이트와 1:1 대응해야 한다.
 */
export function ancestorColumnWidth(
  personId: string,
  parentsOf: Map<string, string[]>,
  nodeMap: Map<string, FamilyTreePerson>,
  depth: number,
  maxDepth: number,
  visited: Set<string>,
): number {
  // 렌더가 null을 반환하는 경우(방문 완료·노드 부재)는 폭 0.
  if (visited.has(personId) || !nodeMap.has(personId)) return 0
  const nextVisited = new Set(visited)
  nextVisited.add(personId)
  const { fatherId, motherId } = ftResolveParentIds(personId, parentsOf, nodeMap)
  const canGoDeeper = depth < maxDepth
  const showFather = canGoDeeper && !!fatherId && !visited.has(fatherId)
  const showMother = canGoDeeper && !!motherId && !visited.has(motherId)
  if (!showFather && !showMother) return NODE_W
  const fatherW =
    showFather && fatherId
      ? ancestorColumnWidth(fatherId, parentsOf, nodeMap, depth + 1, maxDepth, nextVisited)
      : 0
  const motherW =
    showMother && motherId
      ? ancestorColumnWidth(motherId, parentsOf, nodeMap, depth + 1, maxDepth, nextVisited)
      : 0
  const parentsW = fatherW + motherW + (showFather && showMother ? ANC_PARENTS_GAP : 0)
  return Math.max(NODE_W, parentsW)
}

/**
 * 한 자녀 카드 아래에 매달리는 ChildNodeColumn의 실제 폭(px).
 * = max(NODE_W, 손자녀 서브트리 폭). 서브트리가 카드보다 넓으면 카드는 이 폭의
 * 중앙(align-items:center)에 놓이므로, fork/스텁 기하는 NODE_W가 아닌 이 값을 써야 한다.
 */
function childColumnWidth(
  child: ChildPerson,
  descendantsByParentId: Map<string, FamilyTreePerson[]>,
  egoId?: string | null,
): number {
  if (!child.id) return NODE_W
  const grands = descendantsByParentId.get(child.id) ?? []
  const visited = new Set([egoId, child.id].filter(Boolean) as string[])
  const subtreeW = descendantsRowWidth(
    grands,
    descendantsByParentId,
    0,
    DESCENDANT_MAX_DEPTH,
    visited,
  )
  return Math.max(NODE_W, subtreeW)
}

/** 자녀 페어의 렌더 기하 — fork 바 끝점·ChildPair::before·center-shift가 공유하는 단일 출처 */
export interface ChildLayout {
  /** ChildPair 전체 폭(px) — 자녀 컬럼(서브트리 포함) + 배우자 join·카드 반영 */
  pairWidth: number
  /** 자녀 카드 중심 x(페어 좌측 기준 px) */
  childOffset: number
}

/**
 * 자녀 목록 각각의 렌더 기하를 계산.
 *
 * 핵심: 자녀 컬럼 폭은 NODE_W가 아니라 손자녀 서브트리로 팽창한 실측 폭(childColumnWidth).
 * 이 값을 fork SVG·::before 스텁·center-shift가 공유해야 선이 카드와 정확히 만난다.
 * (배우자 join 점유폭은 flex-basis가 아닌 SPOUSE_JOIN_SPAN = basis + margin)
 */
export function computeChildLayouts(
  childList: ChildPerson[],
  descendantsByParentId: Map<string, FamilyTreePerson[]>,
  egoId?: string | null,
): ChildLayout[] {
  return childList.map((child) => {
    const colW = childColumnWidth(child, descendantsByParentId, egoId)
    if (!child.spouse) {
      // ChildPair = ChildNodeColumn(colW) 하나 → 카드가 colW 중앙
      return { pairWidth: colW, childOffset: colW / 2 }
    }
    // [자녀컬럼(colW)][join(SPAN)][배우자(NODE_W)] 또는 좌우 반전
    const pairWidth = colW + SPOUSE_JOIN_SPAN + NODE_W
    const childOffset = isChildOnLeftInPair(child)
      ? colW / 2
      : NODE_W + SPOUSE_JOIN_SPAN + colW / 2
    return { pairWidth, childOffset }
  })
}

/**
 * 자녀들의 시각 중심(첫 자녀와 마지막 자녀 중심의 평균)이 ChildrenGrid 컨테이너 중심에서
 * 얼마나 벗어나 있는지 (px). 양수면 children mean이 컨테이너 중심보다 오른쪽.
 *
 * ChildrenGrid + ForkTrack을 -shift만큼 translateX 하면 자녀 mean이 컨테이너 중심
 * (= ego 수직 드롭 위치)으로 정렬됨. ForkToChildren의 xMid도 자녀 mean을 쓰도록
 * 짝지어 두면 가로 바·수직선 정렬도 함께 유지.
 *
 * 자녀 1명이거나 모두 배우자 없이 서브트리도 대칭일 땐 자연 대칭이라 0.
 */
export function childrenCenterShift(layouts: ChildLayout[]): number {
  if (layouts.length <= 1) return 0
  const totalW =
    layouts.reduce((acc, layout) => acc + layout.pairWidth, 0) +
    (layouts.length - 1) * CHILD_GAP
  const centerX = (index: number) => {
    let start = 0
    for (let earlier = 0; earlier < index; earlier++) {
      start += layouts[earlier].pairWidth + CHILD_GAP
    }
    return start + layouts[index].childOffset
  }
  const xStart = centerX(0)
  const xEnd = centerX(layouts.length - 1)
  const childMean = (xStart + xEnd) / 2
  return childMean - totalW / 2
}
