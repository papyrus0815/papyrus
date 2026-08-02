import {
  buildYearBuckets,
  groupYearsByCentury,
  selectVisibleRows,
} from './list-grouping'
import type { FlattenedHierarchyItem } from './useEventHierarchy'

/**
 * 연도 버킷·헤더리스·가시 행 계약 (2026-08-01 4차 검토 배치 C2).
 *
 * 이 파일에는 spec이 0개였고, 그래서 같은 실패 모드를 두 번 태웠다 —
 * 버킷 귀속을 위치 휴리스틱으로 하다 자식이 엉뚱한 연도 그룹에 편입됐고(IA-2),
 * 접힘 판정이 렌더와 모수에서 갈려 DOM에는 있는데 ↑↓ 내비에서는 빠지는 행이 생겼다(INT-4).
 *
 * 헤더리스 연 그룹은 그 두 실패가 **동시에** 재현될 수 있는 지점이다:
 * 시각 헤더를 지우면 접기 토글도 사라지므로, 접힘을 허용하면 되돌릴 수단 없이 행이 사라진다.
 */
const row = (
  id: string,
  start: string,
  parentNodeId: string | null = null,
): FlattenedHierarchyItem =>
  ({
    node: { id, title: id, period: { start, end: null }, children: [] },
    depth: parentNodeId ? 1 : 0,
    parentNodeId,
    isMatch: true,
    canExpand: false,
    isCollapsedAway: false,
    hiddenChildCount: 0,
  }) as unknown as FlattenedHierarchyItem

describe('buildYearBuckets — 헤더리스 판정', () => {
  it('행이 하나뿐인 연도만 헤더리스가 된다', () => {
    const buckets = buildYearBuckets(
      [
        row('a', '2026-07-27'),
        row('b', '2026-06-26'),
        row('c', '1996-03-01'), // 이 해는 1행뿐
      ],
      'desc',
    )
    expect(buckets.headerlessYears.has(1996)).toBe(true)
    expect(buckets.headerlessYears.has(2026)).toBe(false)
  })

  it('자식이 부모 버킷으로 들어와 2행이 되면 헤더리스가 아니다', () => {
    // 부모 1건 + 그 자식 1건 = 버킷에 2행. 헤더를 지우면 자식 행이 미아가 된다.
    const buckets = buildYearBuckets(
      [row('parent', '1996-03-01'), row('child', '1997-05-02', 'parent')],
      'desc',
    )
    expect(buckets.eventsByYear.get(1996)).toHaveLength(2)
    expect(buckets.headerlessYears.has(1996)).toBe(false)
  })

  it('연도 미상 행은 어떤 버킷에도 들어가지 않는다', () => {
    const buckets = buildYearBuckets([row('x', '')], 'desc')
    expect(buckets.unknownItems).toHaveLength(1)
    expect(buckets.headerlessYears.size).toBe(0)
  })
})

describe('selectVisibleRows — 헤더리스 연도는 접히지 않는다', () => {
  const items = [
    row('a', '2026-07-27'),
    row('b', '2026-06-26'),
    row('solo', '1996-03-01'),
  ]
  const buckets = buildYearBuckets(items, 'desc')

  it('헤더 있는 연도는 접힘이 적용된다', () => {
    const visible = selectVisibleRows(
      items,
      buckets,
      new Set([2026]),
      new Set(),
    )
    expect(visible.map((item) => item.node.id)).toEqual(['solo'])
  })

  it('헤더리스 연도는 접힘 집합에 들어 있어도 살아남는다', () => {
    // 토글이 화면에 없으므로 접히면 되돌릴 방법이 없다.
    const visible = selectVisibleRows(
      items,
      buckets,
      new Set([1996]),
      new Set(),
    )
    expect(visible.map((item) => item.node.id)).toContain('solo')
  })

  it('전 연도 일괄 접기에서도 헤더리스 행은 남는다', () => {
    const visible = selectVisibleRows(
      items,
      buckets,
      new Set(buckets.allYears),
      new Set(),
    )
    expect(visible.map((item) => item.node.id)).toEqual(['solo'])
  })

  it('세기 접힘은 헤더리스 연도에도 그대로 적용된다', () => {
    // 세기 헤더는 항상 있으므로 되돌릴 수단이 존재한다.
    const visible = selectVisibleRows(items, buckets, new Set(), new Set([20]))
    expect(visible.map((item) => item.node.id)).not.toContain('solo')
  })
})

describe('버킷 귀속 — 위치가 아니라 실제 부모를 따른다', () => {
  it('부모가 목록에 없으면 자식은 자기 연도로 폴백한다', () => {
    // 북마크 필터가 부모만 제거해도 자식의 depth는 남는다 — 그때 위치 휴리스틱은
    // 자식을 직전 최상위의 연도로 편입시켜, 행은 자기 해를 주장하는데 헤더는 다른 해였다.
    const orphan = row('child', '0976-01-01', 'missing-parent')
    const buckets = buildYearBuckets([row('top', '1990-01-01'), orphan], 'desc')
    expect(buckets.bucketYearById.get('child')).toBe(976)
  })

  it('헤더 카운트 모수와 렌더 행 귀속이 어긋나지 않는다', () => {
    const items = [
      row('p', '2020-01-02'),
      row('c1', '2021-03-04', 'p'),
      row('c2', '2022-05-06', 'p'),
    ]
    const buckets = buildYearBuckets(items, 'desc')
    // 그룹 단위(부모가 목록에 없는 행)는 1건, 렌더 행은 3행 — 둘은 다른 모수다.
    expect(buckets.yearRootCount.get(2020)).toBe(1)
    expect(buckets.eventsByYear.get(2020)).toHaveLength(3)
    expect(buckets.headerlessYears.has(2020)).toBe(false)
  })
})

describe('groupYearsByCentury', () => {
  it('연속된 같은 세기를 한 그룹으로 묶는다', () => {
    expect(groupYearsByCentury([2026, 2025, 1996, 1990])).toEqual([
      { century: 21, years: [2026, 2025] },
      { century: 20, years: [1996, 1990] },
    ])
  })
})
