/**
 * Event Hierarchy - 루트 술어 단일출처
 * FSD: features/event-hierarchy/model
 *
 * `!event.parentEventId`가 목록·트리·대시보드 4곳에 산재해 있었다. 서버의 루트 정의는
 * `ROOT_EVENT_WHERE = { parentEventId: null }`(apps/api/src/libs/event/domain/event-hierarchy.ts)
 * 하나뿐이므로, 프론트도 그 미러를 **한 곳에만** 둔다.
 *
 * ⚠️ 두 술어를 이름으로 갈라 둔 이유(검토 K4):
 *  - `isTreeRoot`   = 데이터상 최상위. 서버 정의의 미러.
 *  - `isRenderRoot` = 지금 화면의 모수 안에서 최상위. 앵커 스코프(`?anchor=`)·유령 부모용.
 * 이 둘을 한 함수로 묶으면 앵커 스코프에서 "앵커 자신도 parentEventId가 있으니 루트가
 * 아니다"가 되어 화면이 통째로 비는 경로가 생긴다.
 *
 * ⚠️ **`depth === 0`으로 최상위를 판정하지 말 것.** 필터가 걸리면 `matched-rows.ts`가
 * depth를 재계산해 자식 행이 depth 0으로 승격된다 — 그때 depth 기반 판정은 자식을
 * 최상위로 오인한다.
 */

/** 루트 판정에 필요한 최소 형상 — entities/pages 양쪽의 HistoricalEvent를 모두 받는다. */
export interface RootPredicateEventLike {
  id: string
  parentEventId?: string | null
}

/**
 * 데이터상 최상위 사건인가 — 서버 `ROOT_EVENT_WHERE`의 프론트 미러.
 * 화면 모수와 무관하게 사건 자체의 성질을 묻는다.
 */
export const isTreeRoot = (event: RootPredicateEventLike): boolean =>
  !event.parentEventId

/**
 * 지금 렌더 모수 안에서 최상위로 그려야 하는가.
 *
 * 부모가 모수 밖(앵커 스코프로 잘렸거나, 소프트삭제된 유령 부모)이면 그 사건이
 * 이 화면의 최상위다. `scopeIds`가 없으면 전역 모수로 보고 `isTreeRoot`와 같아진다.
 */
export const isRenderRoot = (
  event: RootPredicateEventLike,
  scopeIds?: ReadonlySet<string>,
): boolean => {
  if (!event.parentEventId) return true
  if (!scopeIds) return false
  return !scopeIds.has(event.parentEventId)
}
