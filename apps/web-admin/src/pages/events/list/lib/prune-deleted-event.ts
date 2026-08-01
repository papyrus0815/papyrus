/**
 * 삭제된 사건을 목록 캐시에서 걷어내는 순수 함수.
 *
 * 무효화만으로는 지운 행이 화면에 남는다 — 목록은 `useInfiniteQuery`이고 `maxPages`를
 * 걸지 않아 v5 재검증이 **저장된 모든 페이지를 처음부터 순차 재요청**한다. `autoLoadAll`이라
 * 페이지 수는 항상 '전체/pageSize'이므로 228건·pageSize 100이면 3회, 2,000건이면 20회
 * 순차 요청 + 전량 페이로드 재수신이다. 그 사이 토스트는 떴는데 방금 지운 행이 그대로
 * 보인다(검토 DATA-6).
 *
 * 그래서 캐시에서 먼저 걷어내고 무효화는 배경 정합용으로만 남긴다.
 * 컴포넌트에서 분리한 이유는 이 규칙을 실데이터 삭제 없이 테스트하기 위해서다.
 */

/** 캐시에 저장된 사건의 최소 구조 — id와 중첩 자식만 알면 된다. */
export interface PrunableEvent {
  id: string
  childEvents?: PrunableEvent[]
}

/**
 * 한 페이지(사건 배열)에서 해당 id를 제거한다. 자식으로 중첩된 경우도 재귀로 훑는다.
 *
 * ⚠️ 삭제된 부모의 *살아있는* 자식은 서버가 최상위로 승격하거나 추가 상위로 재배치한다
 * (event.service의 삭제 트랜잭션). 여기서는 지워진 노드만 걷어내고 재배치 결과는
 * 뒤따르는 무효화가 맞춘다 — 클라이언트가 서버 규약을 흉내 내면 두 진실이 갈린다.
 */
export function pruneEventFromPage<T extends PrunableEvent>(
  page: T[],
  deletedId: string,
): T[] {
  let changed = false
  const next = page
    .filter((event) => {
      if (event.id !== deletedId) return true
      changed = true
      return false
    })
    .map((event) => {
      if (!event.childEvents?.length) return event
      const prunedChildren = pruneEventFromPage(event.childEvents, deletedId)
      if (prunedChildren === event.childEvents) return event
      changed = true
      return { ...event, childEvents: prunedChildren }
    })
  // 바뀐 게 없으면 원본 참조를 그대로 돌려 불필요한 리렌더를 만들지 않는다.
  return changed ? next : page
}

/** 무한 스크롤 캐시(pages 배열) 전체에 적용. */
export function pruneEventFromPages<T extends PrunableEvent>(
  pages: T[][],
  deletedId: string,
): T[][] {
  let changed = false
  const next = pages.map((page) => {
    const pruned = pruneEventFromPage(page, deletedId)
    if (pruned !== page) changed = true
    return pruned
  })
  return changed ? next : pages
}
