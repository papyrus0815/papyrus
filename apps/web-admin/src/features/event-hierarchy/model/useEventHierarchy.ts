/**
 * Event Hierarchy Feature - Hierarchy Logic Hook
 * FSD: features/event-hierarchy/model
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { dateSortKey, isoYearSpan } from '@/shared/lib/iso-date'

import type {
  EventHierarchyNode,
  HistoricalEvent,
} from '../../../pages/events/create/events.types'

/**
 * flattenedHierarchy 단일 항목 — useEventHierarchy의 출력 계약.
 * grid/gallery/map/tree/dashboard/timeline 등 소비처가 각자 재선언하던 `FlatItem`을
 * 이 단일 타입으로 통일한다(계약 변경 시 한 곳만 고치면 됨).
 */
export interface FlattenedHierarchyItem {
  node: EventHierarchyNode
  depth: number
  parentEvent: HistoricalEvent | null
  /**
   * 이 사건 자체가 현재 필터를 만족하는가. 필터가 없으면 항상 true.
   * false = '매칭된 후손을 가진 부모'라서 문맥용으로만 남은 행 → 카운트에서 제외한다.
   */
  isMatch: boolean
  /**
   * 필터 때문에 이 행 아래에서 숨겨진 직계 자식 수. 0이면 숨긴 게 없다.
   * 행이 "조건 밖 N건"을 표시해, 자식이 조용히 사라진 것처럼 보이지 않게 한다.
   */
  hiddenChildCount: number
  /**
   * 이 행에서 펼치기/접기가 **실제로 동작하는가**.
   *
   * 자식 보유 여부(`node.children.length > 0`)와 다르다. 평면(계층 OFF) 모드는 모든
   * 자손을 depth 0으로 이미 나열하므로 펼칠 것이 남아 있지 않은데, 행은 자식 수만 보고
   * 셰브론과 aria-expanded를 그려 **눌러도 아무 일이 없는 죽은 컨트롤**이 됐다
   * (실측: flat 모드에서 '하위 사건 1개 펼치기' 클릭 → 행 수 239 → 239).
   * 렌더 계층이 모드를 추측하지 않도록 평탄화가 명시적으로 알려준다.
   */
  canExpand: boolean
  /**
   * 펼쳤을 때 **실제로 나타나는** 직계 자식 수 — 셰브론 배지의 정본.
   *
   * `node.children.length`(원본 트리)와 다르다. 필터가 걸리면 자식도 같은 술어로 걸러지므로
   * (아래 `keepsNode`) 원본 수를 표시하면 배지는 '하위 11개'인데 펼치면 0행인 죽은 약속이
   * 된다(실측: 카테고리 '외교' + '대동방위기' → 배지 11 / 렌더 0, '1차세계대전' → 18 / 8).
   * 평면 모드는 펼칠 것이 없으므로 항상 0.
   */
  visibleChildCount: number
  /**
   * 이 행의 부모 *노드* id(최상위는 null).
   *
   * `parentEvent`는 부모의 HistoricalEvent이고 평면 모드에선 다른 값이 들어간다.
   * 접힘 계산·버킷 귀속처럼 '트리에서 누구 밑인가'가 필요한 곳은 이 필드를 써야
   * 배열 순서('직전 depth 0이 곧 내 부모') 같은 위치 휴리스틱에 기대지 않는다.
   */
  parentNodeId: string | null
  /**
   * 접힌 조상(부모/조부모) 아래에 있어 **목록에 렌더되지 않는** 행인가.
   *
   * 평탄화 결과는 목록 외에 타임라인·격자·지도·통계·트리·갤러리·JSON 내보내기가
   * 공유하므로, 접힘 때문에 항목을 배열에서 빼면 다른 화면의 데이터까지 사라진다.
   * 모집단은 항상 완전하게 두고 목록만 이 플래그로 걸러 낸다.
   */
  isCollapsedAway: boolean
}

/**
 * 노드 기간(period) 정렬 비교자 — 네이티브 Date 대신 정수 키/연 단위 기간을 써
 * BC(음수 연도)·미상 날짜를 안정 정렬한다. 미상은 NEGATIVE_INFINITY로 한쪽 끝에 모음.
 */
const compareNodes = (
  aStart: string,
  aEnd: string | undefined,
  bStart: string,
  bEnd: string | undefined,
  sortBy: string,
): number => {
  if (sortBy === 'duration') {
    return isoYearSpan(aStart, aEnd) - isoYearSpan(bStart, bEnd)
  }
  return (
    (dateSortKey(aStart) ?? Number.NEGATIVE_INFINITY) -
    (dateSortKey(bStart) ?? Number.NEGATIVE_INFINITY)
  )
}

interface HierarchyFilterOptions {
  /** 단일 사건이 현재 필터를 만족하는가 (useEventFilters.matchesEvent) */
  matchesEvent?: (event: HistoricalEvent) => boolean
  /** 내용을 좁히는 필터가 하나라도 걸려 있는가 — false면 자식 필터링 자체를 건너뛴다 */
  hasNarrowingFilters?: boolean
}

export const useEventHierarchy = (
  sortedEvents: HistoricalEvent[],
  events: HistoricalEvent[],
  showFlatView: boolean,
  sortBy: string = 'recent',
  sortDirection: 'asc' | 'desc' = 'desc',
  filterOptions: HierarchyFilterOptions = {},
) => {
  const { matchesEvent, hasNarrowingFilters = false } = filterOptions
  const [expandedEventIds, setExpandedEventIds] = useState<Set<string>>(
    new Set(),
  )

  /**
   * 지금까지 한 번이라도 '펼칠 수 있다'고 판정된 노드 id 전부.
   * 자동 펼침의 증분 기준이자 **'하위 모두 펼치기'의 복원 모수**다(아래 effect 참고).
   */
  const autoExpandedRef = useRef<Set<string>>(new Set())

  /**
   * '하위 사건 모두 접기'가 눌린 상태 — 눌린 뒤 도착한 페이지의 부모까지 자동 전개되면
   * 접기가 계속 되돌려진다(autoLoadAll이 페이지를 연쇄 소진하므로 실제로 그렇게 된다).
   * 사용자가 '모두 펼치기'를 누르거나 개별 셰브론을 열면 해제된다(검토 CR-5).
   */
  const collapseAllRef = useRef(false)

  const collapseAllChildren = useCallback(() => {
    collapseAllRef.current = true
    setExpandedEventIds(new Set())
  }, [])

  const expandAllChildren = useCallback(() => {
    collapseAllRef.current = false
    setExpandedEventIds(new Set(autoExpandedRef.current))
  }, [])

  // 안정 참조 — CompactList → EventListItem으로 그대로 내려가 React.memo가 실효.
  const toggleEventExpansion = useCallback((eventId: string) => {
    setExpandedEventIds((prev) => {
      const next = new Set(prev)
      if (next.has(eventId)) next.delete(eventId)
      else next.add(eventId)
      /**
       * ⚠️ 여기서 `collapseAllRef`를 해제하지 않는다(검토 CTRL-9).
       *
       * 예전엔 셰브론 하나만 펼쳐도 '모두 접기' 의도가 끝난 것으로 보고 래치를 풀었다.
       * 그런데 목록은 페이지를 연쇄 소진하므로(autoLoadAll), 래치가 풀린 뒤 도착한
       * 페이지의 부모들이 자동 전개되면서 **접어 둔 화면이 저절로 부분 복귀**했다 —
       * 사용자는 한 건을 열었을 뿐인데 수십 행이 함께 돌아온다.
       * 래치를 푸는 것은 사용자가 '하위 펼치기'를 명시적으로 누를 때뿐이다.
       */
      return next
    })
  }, [])

  /**
   * 평탄화 — **접힘과 무관한 비싼 계산**.
   *
   * deps에 expandedEventIds가 있던 시절엔 셰브론을 한 번 누를 때마다 트리 전체를 다시
   * 걸으며 필터 술어를 재평가했다(검토 DATA-8). 접힘은 '어떤 행을 렌더할지'일 뿐
   * '무엇이 조건을 만족하는지'를 바꾸지 않으므로, 그 값은 아래 싼 memo에서 덧입힌다.
   */
  const flattenedBase = useMemo(() => {
    const result: FlattenedHierarchyItem[] = []
    // 자식 노드의 부모 이벤트 조회를 O(1)로. 이전엔 노드마다 events.find(O(N))라
    // 자동 전체 펼침(모든 부모 펼침)과 곱해져 대규모에서 O(자식수 × N)였다.
    const eventById = new Map(events.map((event) => [event.id, event]))

    /**
     * 필터가 걸린 동안 자식에도 같은 조건을 적용한다.
     *
     * 필터는 '어떤 루트를 보여줄지'만 정하고 '무엇을 렌더할지'는 통제하지 못했다 —
     * 매칭된 부모의 자식은 카테고리·검색어·세기와 무관하게 전부 나왔고 카운트에도
     * 들어갔다(검토 TF-8/DATA-6). 자기 또는 후손이 매칭될 때만 자식을 남긴다.
     */
    const filteringActive = hasNarrowingFilters && !!matchesEvent

    /**
     * 술어 평가 — 한 노드가 이 memo 한 번에 **4~6회** 조회된다
     * (⑴ 부모의 hiddenCountOf→keepsNode ⑵ children.filter(keepsNode) ⑶ 자기 nodeMatches
     *  ⑷ 자기 hiddenCountOf 재귀). 2,000건(~3,200 노드)이면 조작 한 번에 1만 회 규모다
     * (검토 DATA-8).
     *
     * 캐시는 여기가 아니라 **`useEventFilters.matchesEvent` 안**에 있다(검토 PERF-5).
     * 여기 두면 루트 선별(`filteredEvents`)이 이미 계산해 둔 같은 결과를 이 훅이 다시
     * 계산한다 — 캐시가 술어와 같은 수명을 갖도록 술어 쪽으로 올렸다.
     */
    const nodeMatches = (node: EventHierarchyNode): boolean => {
      if (!filteringActive) return true
      const event = eventById.get(node.id)
      return event ? matchesEvent(event) : false
    }
    const keepsCache = new Map<string, boolean>()
    const keepsNode = (node: EventHierarchyNode): boolean => {
      if (!filteringActive) return true
      const cached = keepsCache.get(node.id)
      if (cached !== undefined) return cached
      const result =
        nodeMatches(node) || (node.children ?? []).some(keepsNode)
      keepsCache.set(node.id, result)
      return result
    }
    /** 필터로 잘려나간 직계 자식 수 */
    const hiddenCountOf = (node: EventHierarchyNode): number => {
      if (!filteringActive || !node.children) return 0
      return node.children.filter((child) => !keepsNode(child)).length
    }

    if (showFlatView) {
      const addAllEventsFlat = (
        node: EventHierarchyNode,
        parentEvent: HistoricalEvent | null,
        parentNodeId: string | null,
      ) => {
        result.push({
          node,
          depth: 0, // 모든 사건을 depth 0으로
          parentEvent,
          parentNodeId,
          isMatch: nodeMatches(node),
          // 평면 모드는 계층을 보여주지 않으므로 '숨긴 자식'을 알릴 자리가 없다.
          hiddenChildCount: 0,
          // 자손이 이미 같은 목록에 평면으로 나열돼 있어 펼칠 것이 없다.
          canExpand: false,
          visibleChildCount: 0,
          // 평면 모드는 접기 개념이 없다 — 전부 렌더된다.
          isCollapsedAway: false,
        })
        // 자식들도 재귀적으로 추가 (depth 0으로)
        if (node.children) {
          const childParentEvent =
            eventById.get(node.id) ?? parentEvent
          node.children.filter(keepsNode).forEach((child) => {
            addAllEventsFlat(child, childParentEvent, node.id)
          })
        }
      }

      sortedEvents.forEach((event) => {
        addAllEventsFlat(event.hierarchy, event, null)
      })

      // 평면 모드에서는 정렬 기준에 따라 재정렬 (BC·미상 안전)
      result.sort((a, b) => {
        const comparison = compareNodes(
          a.node.period.start,
          a.node.period.end,
          b.node.period.start,
          b.node.period.end,
          sortBy,
        )
        return sortDirection === 'asc' ? comparison : -comparison
      })
    } else {
      /**
       * 계층 뷰.
       *
       * ⚠️ 접힘 여부와 무관하게 **모든 자손을 방출**하고, 접힌 조상 아래인지를
       * `isCollapsedAway` 플래그로만 표시한다.
       *
       * 예전엔 `expandedEventIds`에 없는 부모의 자식을 아예 traverse하지 않았다. 그런데
       * 이 배열은 목록만 쓰는 게 아니라 **타임라인·격자·지도·통계·트리·갤러리와
       * JSON 내보내기가 전부 같은 것을 받는다**. 그래서 목록에서 부모 하나를 접으면
       * 다른 뷰의 막대와 내보내기 결과에서 그 자손이 통째로 사라졌다 — 지역 표시 조작이
       * 다른 화면의 데이터를 삭제한 셈이다(검토 CR-1).
       * 이제 접힘은 '렌더 시점 skip'으로만 작용하고 모집단은 항상 완전하다.
       */
      const traverse = (
        node: EventHierarchyNode,
        depth: number,
        parentEvent: HistoricalEvent | null,
        parentNodeId: string | null,
      ) => {
        /**
         * 자식을 **먼저** 확정한다 — 셰브론이 약속하는 수와 펼쳤을 때 나오는 행 수가
         * 같은 배열에서 나와야 하기 때문이다. 예전엔 행을 push한 뒤에 자식을 걸러서,
         * 배지는 원본 `node.children.length`를 말하고 렌더는 필터 통과분만 그렸다.
         * 하위 사건도 부모와 동일한 정렬 적용 (BC·미상 안전).
         */
        const sortedChildren = (node.children ?? [])
          .filter(keepsNode)
          .sort((left, right) => {
            const comparison = compareNodes(
              left.period.start,
              left.period.end,
              right.period.start,
              right.period.end,
              sortBy,
            )
            return sortDirection === 'asc' ? comparison : -comparison
          })

        result.push({
          node,
          depth,
          parentEvent,
          parentNodeId,
          isMatch: nodeMatches(node),
          hiddenChildCount: hiddenCountOf(node),
          canExpand: sortedChildren.length > 0,
          visibleChildCount: sortedChildren.length,
          // 접힘은 이 memo 밖에서 계산한다(아래 주석 참고) — 여긴 자리만 채운다.
          isCollapsedAway: false,
        })

        if (sortedChildren.length > 0) {
          const childParentEvent = eventById.get(node.id) ?? parentEvent
          sortedChildren.forEach((child) => {
            traverse(child, depth + 1, childParentEvent, node.id)
          })
        }
      }

      sortedEvents.forEach((event) => {
        traverse(event.hierarchy, 0, event, null)
      })
    }

    return result
  }, [
    sortedEvents,
    events,
    showFlatView,
    sortBy,
    sortDirection,
    matchesEvent,
    hasNarrowingFilters,
  ])

  /**
   * 자동 펼침 — 모수는 **평탄화 결과 전체**다(루트 목록이 아니라).
   *
   * 예전엔 이 순회가 `sortedEvents`, 즉 `useEventFilters`가 `!event.parentEventId`로
   * 잘라 낸 **루트 배열**만 돌았다(`useEventFilters.ts:329`). 그런데 렌더 모수는
   * `flattenedBase`(전량)라 두 모수가 갈렸고, 결과적으로
   *   ⑴ 자식을 가진 depth 1 부모 2개는 어떤 버튼으로도 열리지 않았고
   *   ⑵ 손자 5행이 기본 화면·'하위 모두 펼치기'·'전체 초기화' 어디에서도 나오지 않았다
   *      (실측: 평탄화 273행 중 렌더 268행 — 5행이 영구 은닉).
   * `autoExpandedRef`가 '모두 펼치기'의 복원 모수이기도 하므로, 손으로 편 손자가
   * '하위 접기 → 하위 펼치기' 왕복 한 번에 영구히 사라지는 결함도 여기서 갈라져 나왔다.
   *
   * *신규* 항목만 증분 추가하는 성질은 그대로다 — 자동 로드가 페이지를 연쇄 소진하는
   * 동안 매번 Set을 재생성하면 setState→flatten이 연쇄되고 수동 접기도 덮어쓴다.
   */
  useEffect(() => {
    const newlyExpandable: string[] = []
    for (const item of flattenedBase) {
      if (item.canExpand && !autoExpandedRef.current.has(item.node.id)) {
        newlyExpandable.push(item.node.id)
      }
    }
    if (newlyExpandable.length === 0) return // 신규 없음 → setState 생략
    newlyExpandable.forEach((id) => autoExpandedRef.current.add(id))
    // '모두 접기' 중이면 신규 부모도 접힌 채로 둔다 — 아니면 페이지가 도착할 때마다
    // 접기가 조금씩 되돌려져 사용자가 30여 번 누른 결과가 사라진다.
    if (collapseAllRef.current) return
    setExpandedEventIds((prev) => {
      const next = new Set(prev)
      newlyExpandable.forEach((id) => next.add(id))
      return next
    })
  }, [flattenedBase])

  /**
   * 접힘 덧입히기 — O(n) 한 번. DFS 선순회라 부모 항목이 항상 먼저 나오므로,
   * '부모가 접혔거나 부모가 이미 접힘 아래면 나도 접힘 아래'를 단일 전방 패스로 계산한다.
   * 셰브론 조작은 이 memo만 다시 돈다(술어 재평가 없음).
   *
   * ⚠️ **필터가 걸린 동안 매칭 행은 접힘을 무시하고 드러난다**(검토 FILT-2·DEPTH-1).
   * 검색은 '이 조건에 맞는 사건을 보여 달라'는 요청인데, 접힘은 그 요청보다 먼저 걸려 있던
   * 표시 상태다. 둘이 곱해지면 헤더는 '조건 일치 29건'이라 말하고 화면에는 11행만 남는다
   * (실측: '차관' 16건 중 12행, '전투' 29건 중 매칭 11행). 사용자의 수동 접힘 자체는
   * 보존하므로 필터를 풀면 원래 접힌 모습으로 정확히 돌아간다.
   * 문맥용 부모 행(`isMatch=false`)은 강제 노출 대상이 아니다 — 조건에 맞는 것만 끌어낸다.
   */
  const flattenedHierarchy = useMemo(() => {
    if (showFlatView) return flattenedBase
    const revealMatches = hasNarrowingFilters && !!matchesEvent
    const collapsedAwayById = new Map<string, boolean>()
    let anyCollapsed = false
    const next = flattenedBase.map((item) => {
      const parentId = item.parentNodeId
      const collapsedAway =
        parentId !== null &&
        !(revealMatches && item.isMatch) &&
        ((collapsedAwayById.get(parentId) ?? false) ||
          !expandedEventIds.has(parentId))
      collapsedAwayById.set(item.node.id, collapsedAway)
      if (collapsedAway) anyCollapsed = true
      return collapsedAway === item.isCollapsedAway
        ? item
        : { ...item, isCollapsedAway: collapsedAway }
    })
    // 접힌 게 하나도 없으면 원본 배열을 그대로 돌려 참조 안정성을 지킨다.
    return anyCollapsed ? next : flattenedBase
  }, [
    flattenedBase,
    expandedEventIds,
    showFlatView,
    hasNarrowingFilters,
    matchesEvent,
  ])

  /**
   * 필터를 실제로 만족하는 사건 수 — **모수 규약 ①**(검토 DATA-6).
   *
   * > `matchedCount`는 ①술어 직후를 센다. `displayedCount`는 ④밴드 접힘 이후를 센다.
   * > 그 사이 단계(②북마크·③계층접힘)는 어느 카운트에도 영향을 주지 않는다.
   *
   * 그래서 `isCollapsedAway`(③ 계층 접힘)를 **보지 않는다**. 예전엔 이 값을 함께
   * 봐서 데이터도 조건도 그대로인데 '하위 접기' 한 번에 '조건 일치 233건'이 146건으로
   * 떨어졌다 — 접기는 표시 조작이지 조건이 아니다. 화면에 실제로 남은 행 수는
   * 별도 숫자(`displayedCount`)가 말한다.
   * 문맥용으로만 남은 부모 행(`isMatch=false`)은 여전히 제외한다.
   */
  const matchedCount = useMemo(
    () => flattenedHierarchy.filter((item) => item.isMatch).length,
    [flattenedHierarchy],
  )

  return {
    expandedEventIds,
    setExpandedEventIds,
    toggleEventExpansion,
    collapseAllChildren,
    expandAllChildren,
    flattenedHierarchy,
    matchedCount,
  }
}
