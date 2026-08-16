/**
 * Event Hierarchy - 앵커(최상위 사건) 판정 단일출처
 * FSD: features/event-hierarchy/model
 *
 * 배경(docs/event-root-designation-review.md): 생존 루트 167건 중 147건(88%)이 자식 0인
 * 단독 사건이라, '1차세계대전' 같은 앵커가 목록에서 완전히 동등한 자격으로 파묻힌다.
 * 스키마에는 앵커·규모를 나타내는 컬럼이 없고 루트 판정(`parentEventId IS NULL`)뿐이다.
 *
 * 그래서 앵커는 **저장하지 않고 파생**한다 — 자손이 하나라도 있으면 앵커다.
 * 이렇게 두면 자식을 붙이거나 떼는 순간 앵커 여부가 저절로 따라오고, 백필도 필요 없다.
 * (자손 0인 사건을 미리 앵커로 '선언'하는 명시 오버라이드는 배치1에서 얹는다.)
 *
 * ⚠️ 목록·트리·상세·칩·정렬이 **전부 이 파일을 경유**해야 한다. 지면마다 다른 것을 세던
 * 것이 원래 문제였다(검토 근인 4 — 직계만 세는 곳/로드된 것만 세는 곳/루트만 세는 곳).
 */
import { isTreeRoot, type RootPredicateEventLike } from './root-event'

/**
 * 앵커 판정 임계 — 자손이 이 수 이상이면 앵커.
 *
 * 3으로 올리면 자식 있는 루트 20건 중 8건이 탈락한다(보불전쟁 2·1차 아편전쟁 2·보오전쟁 1).
 * 실측 근거는 검토서 '지금 상태' 표 참고. 바꿀 일이 생기면 이 상수 하나만 만진다.
 */
export const ANCHOR_MIN_DESCENDANTS = 1

/** 자손 수 계산에 필요한 최소 노드 형상 */
export interface AnchorHierarchyNodeLike {
  id: string
  children?: AnchorHierarchyNodeLike[]
}

/**
 * 명시 오버라이드 — 파생 판정을 덮어쓴다(서버 `Event.anchorOverride`).
 *  - `'ANCHOR'` 자손 0이어도 앵커. '아직 하위가 없는 전쟁'을 미리 선언하는 경로.
 *  - `'PLAIN'`  자손이 있어도 앵커 제외. 자손 1짜리 잡음을 손으로 빼는 탈출구.
 *  - `null`·미지정 자동(파생).
 */
export type AnchorOverride = 'ANCHOR' | 'PLAIN'

/** 앵커 판정에 필요한 최소 사건 형상 */
export interface AnchorEventLike extends RootPredicateEventLike {
  hierarchy?: AnchorHierarchyNodeLike
  anchorOverride?: AnchorOverride | null
}

/**
 * 서브트리 자손 수(자기 자신 제외).
 *
 * 모수는 transformer가 만든 `hierarchy` — 목록 응답이 root→자식→손자(depth 3)까지
 * 실어 오고 실 데이터 최대 깊이도 3단이라, 오늘 이 값은 실제 자손 수와 정확히 같다.
 * 응답이 더 깊어지면 이 함수는 자동으로 따라가고, 캡에 걸린 만큼만 과소 계상된다.
 *
 * `seen`은 **중복 계상 방지 겸 순환 방어**다. 방문 판정을 재귀 진입점이 아니라
 * *자식을 세기 직전*에 두는 것이 핵심 — 진입점에서 판정하면 순환이 있을 때 재귀는
 * 멈추지만 그 노드가 이미 `1 +`로 더해진 뒤라, 자기 자신이 자기 자손으로 계상된다.
 * 같은 이유로 한 사건이 두 부모 밑에 실려 와도 총수에 두 번 들어가지 않는다.
 */
export const getDescendantCount = (node?: AnchorHierarchyNodeLike): number => {
  if (!node) return 0
  const seen = new Set<string>([node.id])
  const countChildren = (current: AnchorHierarchyNodeLike): number => {
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
export const getEventDescendantCount = (event: AnchorEventLike): number =>
  getDescendantCount(event.hierarchy)

/**
 * 앵커(최상위 사건)인가 — **판정 단일식**.
 *
 *   ANCHOR || (!PLAIN && 자손 ≥ 임계)
 *
 * 명시 오버라이드가 파생을 양방향으로 덮어쓴다. 오버라이드를 '저장된 앵커 여부'가
 * 아니라 '파생의 예외'로 둔 덕분에 도입 시 백필이 0이고, 자식을 붙이거나 떼면
 * 미지정(null) 사건의 앵커 여부가 저절로 따라온다.
 */
export const isAnchorEvent = (event: AnchorEventLike): boolean => {
  if (event.anchorOverride === 'ANCHOR') return true
  if (event.anchorOverride === 'PLAIN') return false
  return getEventDescendantCount(event) >= ANCHOR_MIN_DESCENDANTS
}

/**
 * 하위가 하나도 없는데 명시 지정으로만 앵커인 사건 — '빈 앵커'.
 *
 * 위생 UI의 트리거다. 이걸 표시하지 않으면 (c)('미리 선언')는 곧 유령 앵커 양산기가
 * 된다 — 선언만 해 두고 하위를 영영 안 붙인 사건이 앵커 목록을 채운다.
 */
export const isEmptyAnchorEvent = (event: AnchorEventLike): boolean =>
  event.anchorOverride === 'ANCHOR' && getEventDescendantCount(event) === 0

/**
 * 자손이 0이라 목록에서 스스로 물러나야 하는 단독 사건인가.
 * (앵커의 부정이 아니다 — 자식인 사건은 단독도 앵커도 아니다.)
 */
export const isSoloRootEvent = (event: AnchorEventLike): boolean =>
  isTreeRoot(event) && !isAnchorEvent(event)

/**
 * 배지 라벨 — 사용자 결정(2026-08-11)에 따라 **루트 앵커만 '최상위 사건'**이라 부른다.
 *
 * 비루트 앵커(상위가 있는데 자기 아래로도 가지가 뻗은 사건 — 오늘 2건)는 조망 진입은
 * 똑같이 열어 주되 '최상위'라는 말을 쓰지 않는다. 그러지 않으면 '상위가 있는 최상위
 * 사건'이라는 자기모순 라벨이 화면에 뜬다.
 */
export const getAnchorBadgeLabel = (event: AnchorEventLike): string | null => {
  if (!isAnchorEvent(event)) return null
  const descendants = getEventDescendantCount(event)
  // 비루트 앵커에 '하위 0건'이 찍히는 일은 없다 — 자손 0인 비루트는 오버라이드 ANCHOR로만
  // 앵커가 되는데, 그건 '아직 하위가 없는 상위 사건'이라 라벨이 수치가 아니라 상태여야 한다.
  if (!isTreeRoot(event)) {
    return descendants > 0 ? `하위 ${descendants}건` : '하위 예정'
  }
  return '최상위 사건'
}
