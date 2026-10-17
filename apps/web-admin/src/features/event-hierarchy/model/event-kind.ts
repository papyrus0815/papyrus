/**
 * Event Hierarchy - 사건 종류(단일/묶음) 단일출처
 * FSD: features/event-hierarchy/model
 *
 *  - 단일 사건(SINGLE)     전투·회담·조약 체결·선언. 본문에 배경·전개·여파를 모두 쓴다.
 *                          하위 사건을 가질 수 없다.
 *  - 묶음 사건(COLLECTION) 전쟁·위기·운동·정책. **전개는 하위 사건이 맡고**, 본문은 배경·여파만.
 *
 * 종류는 저장된 값(서버 `Event.kind`)이고, 등록할 때 고르거나 명시적 전환
 * (단일 → '하위 사건으로 나누기', 묶음 → 하위가 없을 때 '단일 사건으로')으로만 바뀐다.
 * 예전처럼 '자손이 있으면 최상위'로 파생하지 않는다 — 하위 하나를 붙이는 순간 지위가 바뀌어
 * 본문이 규칙 밖으로 밀려나던 것이 그 판정의 근본 결함이었다. 규칙의 정본은 서버
 * `apps/api/src/libs/event/domain/event-kind.ts`.
 *
 * ⚠️ 목록·트리·상세·칩·정렬이 전부 이 파일을 경유한다.
 */
import { isTreeRoot, type RootPredicateEventLike } from './root-event'

export type EventKind = 'SINGLE' | 'COLLECTION'

/** 자손 수 계산에 필요한 최소 노드 형상 */
export interface KindHierarchyNodeLike {
  id: string
  children?: KindHierarchyNodeLike[]
}

/** 종류 판정에 필요한 최소 사건 형상 */
export interface KindEventLike extends RootPredicateEventLike {
  kind?: EventKind | null
  hierarchy?: KindHierarchyNodeLike
}

/**
 * 서브트리 자손 수(자기 자신 제외).
 *
 * 모수는 transformer가 만든 `hierarchy` — 목록 응답이 root→자식→손자(depth 3)까지 싣는다.
 * `seen`은 중복 계상 방지 겸 순환 방어다. 방문 판정을 *자식을 세기 직전*에 두어야 순환에서
 * 자기 자신이 자기 자손으로 계상되지 않고, 두 부모 밑에 실린 사건도 한 번만 센다.
 */
export const getDescendantCount = (node?: KindHierarchyNodeLike): number => {
  if (!node) return 0
  const seen = new Set<string>([node.id])
  const countChildren = (current: KindHierarchyNodeLike): number => {
    const children = current.children
    if (!children || children.length === 0) return 0
    let total = 0
    for (const child of children) {
      if (seen.has(child.id)) continue
      seen.add(child.id)
      total += 1 + countChildren(child)
    }
    return total
  }
  return countChildren(node)
}

/** 이 사건의 자손 수 — 행·배지·정렬이 공유하는 단일 접근자. */
export const getEventDescendantCount = (event: KindEventLike): number =>
  getDescendantCount(event.hierarchy)

/** 묶음 사건인가 */
export const isCollectionEvent = (event: { kind?: EventKind | null }): boolean =>
  event.kind === 'COLLECTION'

/** 아직 하위가 하나도 없는 묶음 — 빈 상태 안내('첫 하위 사건 등록')의 트리거 */
export const isEmptyCollectionEvent = (event: KindEventLike): boolean =>
  isCollectionEvent(event) && getEventDescendantCount(event) === 0

/**
 * 하위가 없어 목록에서 스스로 물러나야 하는 최상위 단일 사건인가.
 * (묶음의 부정이 아니다 — 하위인 사건은 단독도 묶음도 아니다.)
 */
export const isSoloRootEvent = (event: KindEventLike): boolean =>
  isTreeRoot(event) && !isCollectionEvent(event)

/**
 * 배지 라벨 — 최상위 묶음만 '최상위 사건'이라 부른다(사용자 결정 2026-08-11 유지).
 * 상위가 있는 묶음(전쟁 안의 전역 같은)은 '최상위'라는 말 대신 하위 수를 단다 —
 * 아니면 '상위가 있는 최상위 사건'이라는 자기모순 라벨이 뜬다.
 */
export const getCollectionBadgeLabel = (event: KindEventLike): string | null => {
  if (!isCollectionEvent(event)) return null
  if (isTreeRoot(event)) return '최상위 사건'
  const descendants = getEventDescendantCount(event)
  return descendants > 0 ? `하위 ${descendants}건` : '묶음 사건'
}
