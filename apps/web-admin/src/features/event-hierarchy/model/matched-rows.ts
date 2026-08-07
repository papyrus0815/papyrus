/**
 * 평탄화 결과에서 **조건을 만족한 행만** 남기되, 남은 행의 `depth`를 다시 매긴다.
 * FSD: features/event-hierarchy/model
 *
 * ## 왜 단순 filter가 아닌가 (2026-08-02 검증 A — 배치 3 회귀)
 *
 * 배치 3은 집계·시각화 뷰(통계·격자·갤러리·지도)에 `isMatch`인 행만 넘기도록 바꿨다.
 * 의도는 맞다 — '전쟁'으로 좁힌 통계에 문맥용 정치 부모가 집계되면 안 된다.
 * 그런데 그 네 뷰는 전부 **`item.depth !== 0`이면 건너뛴다**(사건 하나를 한 번만 세기
 * 위한 오래된 규약이다). 그래서 단순 filter는 다음을 만든다:
 *
 *   '베르됭 전투'(자식)만 검색어에 걸림 → 평탄화 = [제1차 세계대전(depth 0, isMatch=false),
 *   베르됭 전투(depth 1, isMatch=true)] → isMatch만 남기면 **depth 0 행이 0개** →
 *   통계·격자·갤러리·지도가 "조건과 일치하는 사건이 없습니다"를 띄운다.
 *   같은 순간 목록 뷰에는 베르됭 전투가 멀쩡히 보인다.
 *
 * 즉 문맥 부모를 걷어낸 순간 `depth`가 **거짓말**이 된다 — 조상이 사라졌는데도 자식은
 * 여전히 자기가 depth 1이라고 주장한다. 그래서 남은 집합 안에서 depth를 다시 센다:
 * 살아남은 조상이 없으면 그 행이 곧 최상위(0)다. 결과적으로
 *  - 부모·자식이 **둘 다** 매칭이면 자식은 여전히 depth 1 → 종전처럼 한 번만 세어진다.
 *  - 자식만 매칭이면 자식이 depth 0으로 승격 → 그 뷰들에 정상 노출된다.
 *
 * ⚠️ 평면 보기(`flatView`)에서는 재계산하지 않는다. 평탄화가 이미 모든 노드를 depth 0으로
 * 밀어 넣은 데다 배열을 정렬로 재배치하므로 '부모가 먼저 나온다'는 전제가 깨진다 —
 * 그 상태에서 depth를 다시 매기면 멀쩡한 depth 0 행이 1로 강등돼 같은 결함이 반대 방향으로
 * 재발한다.
 */
import type { FlattenedHierarchyItem } from './useEventHierarchy'

export interface SelectMatchedRowsOptions {
  /** 평면 보기인가 — true면 depth 재계산을 건너뛴다(위 주석 참고). */
  flatView?: boolean
}

export function selectMatchedRows(
  items: FlattenedHierarchyItem[],
  options: SelectMatchedRowsOptions = {},
): FlattenedHierarchyItem[] {
  const matched = items.filter((item) => item.isMatch)
  if (options.flatView) return matched

  /**
   * 계층 평탄화는 DFS 선순회라 조상이 항상 자손보다 먼저 나온다 —
   * 한 번의 전방 패스로 '살아남은 조상의 depth + 1'을 구할 수 있다.
   */
  const depthById = new Map<string, number>()
  return matched.map((item) => {
    const parentDepth =
      item.parentNodeId !== null ? depthById.get(item.parentNodeId) : undefined
    const depth = parentDepth === undefined ? 0 : parentDepth + 1
    depthById.set(item.node.id, depth)
    // 값이 그대로면 원본 객체를 재사용해 참조 안정성을 지킨다(하위 memo·key 비교).
    return depth === item.depth ? item : { ...item, depth }
  })
}
