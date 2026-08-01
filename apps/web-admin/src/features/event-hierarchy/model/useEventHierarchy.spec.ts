import { renderHook } from '@testing-library/react'

import { useEventHierarchy } from './useEventHierarchy'

/**
 * 자식 필터링 회귀 가드 (2026-07-28 검토 배치 4 / TF-8·DATA-6).
 *
 * 필터는 '어떤 루트를 보여줄지'만 정하고 '무엇을 렌더할지'는 통제하지 못했다.
 * 매칭된 부모의 자식은 카테고리·검색어·세기 조건과 무관하게 전부 렌더되고
 * 카운트에도 포함됐다. 이제 평탄화 단계가 같은 술어를 자식에도 적용한다.
 */
type AnyEvent = Parameters<typeof useEventHierarchy>[0][number]

const child = (id: string, category: string) =>
  ({
    id,
    title: id,
    category,
    parentEventId: 'parent',
    hierarchy: {
      id,
      title: id,
      summary: '',
      period: { start: '2000-01-01' },
      importance: 'notable',
      children: [],
    },
  }) as unknown as AnyEvent

const parent = (childCategories: Array<[string, string]>) =>
  ({
    id: 'parent',
    title: 'parent',
    category: '전쟁',
    hierarchy: {
      id: 'parent',
      title: 'parent',
      summary: '',
      period: { start: '2000-01-01' },
      importance: 'notable',
      children: childCategories.map(([id]) => ({
        id,
        title: id,
        summary: '',
        period: { start: '2000-01-01' },
        importance: 'notable',
        children: [],
      })),
    },
  }) as unknown as AnyEvent

const CHILDREN: Array<[string, string]> = [
  ['child-war', '전쟁'],
  ['child-diplomacy', '외교'],
]
const ROOT = parent(CHILDREN)
const ALL = [ROOT, ...CHILDREN.map(([id, category]) => child(id, category))]

const renderFlatten = (
  filterOptions?: Parameters<typeof useEventHierarchy>[5],
) =>
  renderHook(() =>
    useEventHierarchy([ROOT], ALL, false, 'recent', 'desc', filterOptions),
  )

describe('useEventHierarchy — 자식에도 필터 적용', () => {
  it('필터가 없으면 자식을 그대로 전개한다', () => {
    const { result } = renderFlatten()
    const ids = result.current.flattenedHierarchy.map((item) => item.node.id)

    expect(ids).toContain('child-war')
    expect(ids).toContain('child-diplomacy')
    expect(
      result.current.flattenedHierarchy.every((item) => item.isMatch),
    ).toBe(true)
  })

  it('필터가 걸리면 조건 밖 자식은 렌더하지 않는다', () => {
    const { result } = renderFlatten({
      hasNarrowingFilters: true,
      matchesEvent: (event) => event.category === '전쟁',
    })
    const ids = result.current.flattenedHierarchy.map((item) => item.node.id)

    expect(ids).toContain('child-war')
    // 예전엔 부모가 매칭됐다는 이유로 '외교' 자식까지 그대로 나왔다.
    expect(ids).not.toContain('child-diplomacy')
  })

  it('잘려나간 자식 수를 부모 행에 알린다 — 조용한 누락 방지', () => {
    const { result } = renderFlatten({
      hasNarrowingFilters: true,
      matchesEvent: (event) => event.category === '전쟁',
    })
    const parentRow = result.current.flattenedHierarchy.find(
      (item) => item.node.id === 'parent',
    )

    expect(parentRow?.hiddenChildCount).toBe(1)
  })

  it('matchedCount는 문맥용 부모 행을 세지 않는다', () => {
    const { result } = renderFlatten({
      hasNarrowingFilters: true,
      // 부모는 매칭 안 되고 자식 하나만 매칭되는 상황
      matchesEvent: (event) => event.id === 'child-diplomacy',
    })

    const parentRow = result.current.flattenedHierarchy.find(
      (item) => item.node.id === 'parent',
    )
    expect(parentRow?.isMatch).toBe(false)
    expect(result.current.matchedCount).toBe(1)
  })
})
