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

/** 캐시에 저장된 사건의 최소 구조 — id·상위 참조·중첩 자식만 알면 된다. */
export interface PrunableEvent {
  id: string
  parentEventId?: string | null
  childEvents?: PrunableEvent[]
}

export interface PruneEventOptions {
  /**
   * true이면 삭제된 사건의 직계 하위(`childEvents`)를 함께 버리지 않고
   * 최상위(`parentEventId: null`)로 승격해 페이지에 남긴다('하위 사건은 남기기' 선택 시).
   */
  keepChildren?: boolean
}

function pruneNestedKeepChildren<T extends PrunableEvent>(
  children: T[],
  deletedId: string,
  promotedOut: T[],
): T[] {
  let changed = false
  const next = children
    .filter((child) => {
      if (child.id !== deletedId) return true
      changed = true
      if (child.childEvents?.length) {
        for (const grand of child.childEvents as T[]) {
          promotedOut.push({ ...grand, parentEventId: null })
        }
      }
      return false
    })
    .map((child) => {
      if (!child.childEvents?.length) return child
      const nextGrand = pruneNestedKeepChildren(
        child.childEvents as T[],
        deletedId,
        promotedOut,
      )
      if (nextGrand === child.childEvents) return child
      changed = true
      return { ...child, childEvents: nextGrand }
    })
  return changed ? next : children
}

/**
 * 한 페이지(사건 배열)에서 해당 id를 제거한다. 자식으로 중첩된 경우도 재귀로 훑는다.
 *
 * - 기본(`keepChildren = false`): 부모와 그 하위 트리를 함께 제거한다('하위 사건도 함께 휴지통으로').
 * - `keepChildren = true`: 삭제된 노드의 직계 하위를 `parentEventId: null`로 승격해 페이지에 남긴다
 *   ('하위 사건은 남기기'). 배경 무효화가 끝날 때까지 살아남은 하위 사건이 화면에서 증발하지 않게 한다.
 */
export function pruneEventFromPage<T extends PrunableEvent>(
  page: T[],
  deletedId: string,
  options: PruneEventOptions = {},
): T[] {
  if (!options.keepChildren) {
    let changed = false
    const next = page
      .filter((event) => {
        if (event.id !== deletedId) return true
        changed = true
        return false
      })
      .map((event) => {
        if (!event.childEvents?.length) return event
        const prunedChildren = pruneEventFromPage(
          event.childEvents as T[],
          deletedId,
        )
        if (prunedChildren === event.childEvents) return event
        changed = true
        return { ...event, childEvents: prunedChildren }
      })
    // 바뀐 게 없으면 원본 참조를 그대로 돌려 불필요한 리렌더를 만들지 않는다.
    return changed ? next : page
  }

  let changed = false
  const result: T[] = []
  const promotedFromNested: T[] = []

  for (const event of page) {
    if (event.id === deletedId) {
      changed = true
      if (event.childEvents?.length) {
        for (const child of event.childEvents as T[]) {
          result.push({ ...child, parentEventId: null })
        }
      }
      continue
    }

    let updated = event
    if (updated.parentEventId === deletedId) {
      changed = true
      updated = { ...updated, parentEventId: null }
    }

    if (updated.childEvents?.length) {
      const prunedChildren = pruneNestedKeepChildren(
        updated.childEvents as T[],
        deletedId,
        promotedFromNested,
      )
      if (prunedChildren !== updated.childEvents) {
        changed = true
        updated = { ...updated, childEvents: prunedChildren }
      }
    }

    result.push(updated)
  }

  if (promotedFromNested.length > 0) {
    const existingIds = new Set(result.map((item) => item.id))
    for (const promoted of promotedFromNested) {
      if (!existingIds.has(promoted.id)) {
        result.push(promoted)
        existingIds.add(promoted.id)
      }
    }
  }

  return changed ? result : page
}

/** 무한 스크롤 캐시(pages 배열) 전체에 적용. */
export function pruneEventFromPages<T extends PrunableEvent>(
  pages: T[][],
  deletedId: string,
  options: PruneEventOptions = {},
): T[][] {
  let changed = false
  const next = pages.map((page) => {
    const pruned = pruneEventFromPage(page, deletedId, options)
    if (pruned !== page) changed = true
    return pruned
  })
  return changed ? next : pages
}
