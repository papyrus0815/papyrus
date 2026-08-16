import { act, renderHook } from '@testing-library/react'

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

  /**
   * 모수 규약 ①(검토 DATA-6) — matchedCount는 **술어 직후**를 센다.
   * 계층 접힘은 표시 조작이므로 이 숫자를 흔들면 안 된다.
   */
  it('하위 접기는 matchedCount를 바꾸지 않는다', () => {
    const { result } = renderFlatten({
      hasNarrowingFilters: true,
      matchesEvent: (event) => event.category === '전쟁',
    })
    // 부모(전쟁) + 자식(child-war) = 2
    const before = result.current.matchedCount
    expect(before).toBe(2)

    act(() => {
      result.current.collapseAllChildren()
    })

    expect(result.current.matchedCount).toBe(before)
  })

  /**
   * 검토 FILT-2·DEPTH-1 — 접힘은 검색보다 먼저 걸려 있던 표시 상태이고,
   * 검색은 '조건에 맞는 것을 보여 달라'는 나중의 요청이다. 둘이 곱해지면
   * 헤더는 '조건 일치 29건'인데 화면엔 11행만 남는다.
   */
  it('필터 중에는 접어 두었어도 매칭 행이 드러난다', () => {
    const { result } = renderFlatten({
      hasNarrowingFilters: true,
      matchesEvent: (event) => event.category === '전쟁',
    })

    act(() => {
      result.current.collapseAllChildren()
    })

    const warRow = result.current.flattenedHierarchy.find(
      (item) => item.node.id === 'child-war',
    )
    expect(warRow?.isMatch).toBe(true)
    expect(warRow?.isCollapsedAway).toBe(false)
  })

  it('필터가 없으면 하위 접기가 자식 행을 그대로 감춘다', () => {
    const { result } = renderFlatten()

    act(() => {
      result.current.collapseAllChildren()
    })

    const hidden = result.current.flattenedHierarchy.filter(
      (item) => item.isCollapsedAway,
    )
    expect(hidden.map((item) => item.node.id).sort()).toEqual([
      'child-diplomacy',
      'child-war',
    ])
  })

  /**
   * 검토 FILT-3 — 배지가 약속하는 수와 펼쳤을 때 나오는 행 수는 같은 배열에서 나와야 한다.
   * 예전엔 배지가 원본 `node.children.length`(2)를 말하고 렌더는 필터 통과분(1)만 그렸다.
   */
  it('셰브론 배지 수는 필터 통과 자식 수를 센다', () => {
    const { result } = renderFlatten({
      hasNarrowingFilters: true,
      matchesEvent: (event) => event.category === '전쟁',
    })

    const parentRow = result.current.flattenedHierarchy.find(
      (item) => item.node.id === 'parent',
    )
    expect(parentRow?.node.children).toHaveLength(2)
    expect(parentRow?.visibleChildCount).toBe(1)
    expect(parentRow?.canExpand).toBe(true)
  })
})

/**
 * 검토 DISC-1·CTRL-1 — 자동 펼침·'모두 펼치기'의 모수는 **평탄화 결과 전체**다.
 * 예전엔 루트 배열(`!parentEventId`로 잘린 것)만 돌아서, 손자는 기본 화면에도
 * '하위 모두 펼치기'에도 나오지 않았다(실측: 평탄화 273행 중 렌더 268행).
 */
describe('useEventHierarchy — 손자까지 펼침 모수에 든다', () => {
  const grandchildTree = {
    id: 'root',
    title: 'root',
    category: '전쟁',
    hierarchy: {
      id: 'root',
      title: 'root',
      summary: '',
      period: { start: '1894-01-01' },
      importance: 'notable',
      children: [
        {
          id: 'kid',
          title: 'kid',
          summary: '',
          period: { start: '1900-01-01' },
          importance: 'notable',
          children: [
            {
              id: 'grandkid',
              title: 'grandkid',
              summary: '',
              period: { start: '1913-01-01' },
              importance: 'notable',
              children: [],
            },
          ],
        },
      ],
    },
  } as unknown as AnyEvent

  const renderDeep = () =>
    renderHook(() =>
      useEventHierarchy(
        [grandchildTree],
        // 서버 목록은 루트만 준다 — 자식·손자는 hierarchy 트리 안에만 있다.
        [grandchildTree],
        false,
        'recent',
        'desc',
      ),
    )

  it('기본 진입에서 손자 행이 렌더된다', () => {
    const { result } = renderDeep()
    const rendered = result.current.flattenedHierarchy.filter(
      (item) => !item.isCollapsedAway,
    )
    expect(rendered.map((item) => item.node.id)).toEqual([
      'root',
      'kid',
      'grandkid',
    ])
  })

  it("'모두 접기' 후 '모두 펼치기'가 손자까지 되돌린다", () => {
    const { result } = renderDeep()

    act(() => {
      result.current.collapseAllChildren()
    })
    expect(
      result.current.flattenedHierarchy.filter((item) => !item.isCollapsedAway),
    ).toHaveLength(1)

    act(() => {
      result.current.expandAllChildren()
    })
    expect(
      result.current.flattenedHierarchy.filter((item) => !item.isCollapsedAway),
    ).toHaveLength(3)
  })
})
