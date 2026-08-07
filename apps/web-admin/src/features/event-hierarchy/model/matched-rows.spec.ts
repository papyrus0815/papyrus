import { selectMatchedRows } from './matched-rows'
import type { FlattenedHierarchyItem } from './useEventHierarchy'

/**
 * 배치 3 회귀 가드 (2026-08-02 검증 A).
 *
 * 집계·시각화 뷰(통계·격자·갤러리·지도)는 `item.depth !== 0`이면 건너뛴다.
 * 그래서 문맥 부모를 걷어낸 배열의 depth를 다시 매기지 않으면
 * '자식만 매칭'인 검색에서 그 네 뷰가 통째로 빈 화면이 된다.
 */
const row = (
  id: string,
  depth: number,
  parentNodeId: string | null,
  isMatch: boolean,
): FlattenedHierarchyItem =>
  ({
    node: { id, title: id, period: { start: '2000-01-01', end: null }, children: [] },
    depth,
    parentNodeId,
    isMatch,
    canExpand: false,
    isCollapsedAway: false,
    hiddenChildCount: 0,
    parentEvent: null,
  }) as unknown as FlattenedHierarchyItem

describe('selectMatchedRows', () => {
  it('문맥 부모(isMatch=false)를 뺀다', () => {
    const items = [row('parent', 0, null, false), row('child', 1, 'parent', true)]
    expect(selectMatchedRows(items).map((item) => item.node.id)).toEqual(['child'])
  })

  it('조상이 잘려나간 자식은 depth 0으로 승격된다 — 최상위만 세는 뷰가 놓치지 않도록', () => {
    const items = [row('parent', 0, null, false), row('child', 1, 'parent', true)]
    const matched = selectMatchedRows(items)

    expect(matched[0].depth).toBe(0)
    expect(matched.filter((item) => item.depth === 0)).toHaveLength(1)
  })

  it('부모도 매칭이면 자식의 depth는 그대로 — 한 사건이 두 번 세어지지 않는다', () => {
    const items = [row('parent', 0, null, true), row('child', 1, 'parent', true)]
    const matched = selectMatchedRows(items)

    expect(matched.map((item) => item.depth)).toEqual([0, 1])
  })

  it('손자만 매칭이면 손자가 depth 0이 된다', () => {
    const items = [
      row('root', 0, null, false),
      row('mid', 1, 'root', false),
      row('leaf', 2, 'mid', true),
    ]
    const matched = selectMatchedRows(items)

    expect(matched.map((item) => item.node.id)).toEqual(['leaf'])
    expect(matched[0].depth).toBe(0)
  })

  it('중간만 잘리면 남은 계보로 다시 센다 (root·leaf 매칭, mid 탈락)', () => {
    const items = [
      row('root', 0, null, true),
      row('mid', 1, 'root', false),
      row('leaf', 2, 'mid', true),
    ]
    const matched = selectMatchedRows(items)

    // leaf의 부모(mid)가 없어졌으므로 leaf는 스스로 최상위다.
    expect(matched.map((item) => [item.node.id, item.depth])).toEqual([
      ['root', 0],
      ['leaf', 0],
    ])
  })

  it('평면 보기에서는 depth를 다시 매기지 않는다 — 이미 전부 depth 0이고 배열이 재정렬돼 있다', () => {
    // 평면 모드는 정렬 때문에 자식이 부모보다 앞에 올 수 있다.
    const items = [row('child', 0, 'parent', true), row('parent', 0, null, true)]
    const matched = selectMatchedRows(items, { flatView: true })

    expect(matched.map((item) => item.depth)).toEqual([0, 0])
  })

  it('값이 그대로면 원본 객체를 재사용한다 — 참조 안정성', () => {
    const items = [row('a', 0, null, true)]
    expect(selectMatchedRows(items)[0]).toBe(items[0])
  })
})
