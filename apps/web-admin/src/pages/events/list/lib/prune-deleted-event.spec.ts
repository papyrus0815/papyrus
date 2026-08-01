import {
  pruneEventFromPage,
  pruneEventFromPages,
} from './prune-deleted-event'

describe('pruneEventFromPage', () => {
  it('최상위 행을 제거한다', () => {
    const page = [{ id: 'a' }, { id: 'b' }, { id: 'c' }]
    expect(pruneEventFromPage(page, 'b').map((event) => event.id)).toEqual([
      'a',
      'c',
    ])
  })

  it('자식으로 중첩된 행도 제거한다', () => {
    const page = [
      { id: 'parent', childEvents: [{ id: 'child1' }, { id: 'child2' }] },
    ]
    const next = pruneEventFromPage(page, 'child1')
    expect(next[0].childEvents?.map((child) => child.id)).toEqual(['child2'])
  })

  it('손자까지 재귀로 훑는다', () => {
    const page = [
      {
        id: 'root',
        childEvents: [{ id: 'child', childEvents: [{ id: 'grand' }] }],
      },
    ]
    const next = pruneEventFromPage(page, 'grand')
    expect(next[0].childEvents?.[0].childEvents).toEqual([])
  })

  it('부모를 지우면 그 하위 트리도 함께 빠진다 — 재배치는 서버 몫이라 무효화가 맞춘다', () => {
    const page = [
      { id: 'parent', childEvents: [{ id: 'child' }] },
      { id: 'other' },
    ]
    expect(pruneEventFromPage(page, 'parent').map((event) => event.id)).toEqual([
      'other',
    ])
  })

  it('대상이 없으면 **원본 참조를 그대로** 돌려준다(불필요한 리렌더 방지)', () => {
    const page = [{ id: 'a', childEvents: [{ id: 'b' }] }]
    expect(pruneEventFromPage(page, 'zzz')).toBe(page)
  })

  it('바뀌지 않은 형제 객체의 참조는 유지된다', () => {
    const untouched = { id: 'a', childEvents: [{ id: 'a1' }] }
    const page = [untouched, { id: 'b' }]
    const next = pruneEventFromPage(page, 'b')
    expect(next[0]).toBe(untouched)
  })
})

describe('pruneEventFromPages', () => {
  it('여러 페이지에 걸쳐 적용된다', () => {
    const pages = [[{ id: 'a' }], [{ id: 'b' }, { id: 'c' }]]
    const next = pruneEventFromPages(pages, 'b')
    expect(next.map((page) => page.map((event) => event.id))).toEqual([
      ['a'],
      ['c'],
    ])
  })

  it('대상이 없으면 원본 pages 참조를 그대로 돌려준다', () => {
    const pages = [[{ id: 'a' }], [{ id: 'b' }]]
    expect(pruneEventFromPages(pages, 'zzz')).toBe(pages)
  })

  it('영향 없는 페이지의 참조는 유지된다', () => {
    const untouched = [{ id: 'a' }]
    const pages = [untouched, [{ id: 'b' }]]
    const next = pruneEventFromPages(pages, 'b')
    expect(next[0]).toBe(untouched)
  })
})
